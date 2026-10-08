-- Newsletter: admin access to email_signups, newsletters, newsletter_recipients.
-- Spec: _bmad-output/specs/spec-newsletter/ (data-model.md)
-- From here on the backoffice owns the email_signups schema (created by the
-- landing repo, migrations 0002/0003).

-- ---------------------------------------------------------------------------
-- email_signups: admins read, edit, delete. No admin insert (manual add is
-- TODO, pending iubenda). Landing inserts with the secret key, bypassing RLS.
-- ---------------------------------------------------------------------------

alter table public.email_signups
  add constraint email_signups_email_format
  check (email = lower(email) and length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
  not valid;

create policy "admin read" on public.email_signups
  for select to authenticated using (public.is_admin());
create policy "admin update" on public.email_signups
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.email_signups
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.newsletters (
  id uuid primary key default gen_random_uuid(),
  subject varchar(255) not null check (length(btrim(subject)) > 0),
  body text not null check (length(btrim(body)) > 0),
  status varchar(16) not null default 'draft' check (status in ('draft', 'sending', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'sent') = (sent_at is not null))
);

create table public.newsletter_recipients (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  signup_id uuid references public.email_signups (id) on delete set null,
  email text not null,
  delivery_status varchar(16) not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  delivered_at timestamptz,
  error varchar(255),
  unique (newsletter_id, signup_id)
);

create unique index newsletter_recipients_email_idx
  on public.newsletter_recipients (newsletter_id, lower(email));

create trigger newsletters_set_updated_at
  before update on public.newsletters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admins manage drafts only. Status transitions and delivery results are
-- written by the send-newsletter Edge Function with the service role.
-- ---------------------------------------------------------------------------

alter table public.newsletters enable row level security;
alter table public.newsletter_recipients enable row level security;

create policy "admin read" on public.newsletters
  for select to authenticated using (public.is_admin());
create policy "admin insert draft" on public.newsletters
  for insert to authenticated with check (public.is_admin() and status = 'draft');
create policy "admin update draft" on public.newsletters
  for update to authenticated
  using (public.is_admin() and status = 'draft')
  with check (public.is_admin() and status = 'draft');
create policy "admin delete draft" on public.newsletters
  for delete to authenticated using (public.is_admin() and status = 'draft');

create or replace function public.is_draft_newsletter(p_newsletter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.newsletters where id = p_newsletter_id and status = 'draft');
$$;

revoke execute on function public.is_draft_newsletter(uuid) from public, anon;
grant execute on function public.is_draft_newsletter(uuid) to authenticated;

create policy "admin read" on public.newsletter_recipients
  for select to authenticated using (public.is_admin());
create policy "admin insert on draft" on public.newsletter_recipients
  for insert to authenticated
  with check (public.is_admin() and public.is_draft_newsletter(newsletter_id));
create policy "admin delete on draft" on public.newsletter_recipients
  for delete to authenticated
  using (public.is_admin() and public.is_draft_newsletter(newsletter_id));

-- ---------------------------------------------------------------------------
-- Deleting a subscriber drops them from drafts; sent newsletters keep the
-- email snapshot (signup_id set null by the FK).
-- ---------------------------------------------------------------------------

create or replace function public.remove_signup_from_drafts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.newsletter_recipients r
  using public.newsletters n
  where r.newsletter_id = n.id
    and n.status = 'draft'
    and r.signup_id = old.id;
  return old;
end;
$$;

create trigger email_signups_remove_from_drafts
  before delete on public.email_signups
  for each row execute function public.remove_signup_from_drafts();

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create trigger email_signups_audit
  after insert or update or delete on public.email_signups
  for each row execute function public.write_audit_log();

create trigger newsletters_audit
  after insert or update or delete on public.newsletters
  for each row execute function public.write_audit_log();

create trigger newsletter_recipients_audit
  after insert or update or delete on public.newsletter_recipients
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- save_newsletter: atomic save of a draft and its exact recipient set.
-- payload: { id?, subject, body, signup_ids: uuid[] }
-- ---------------------------------------------------------------------------

create or replace function public.save_newsletter(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(payload ->> 'id', '')::uuid;
  v_signup_ids uuid[];
  v_found int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can save newsletters' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct s::uuid), '{}')
  into v_signup_ids
  from jsonb_array_elements_text(coalesce(payload -> 'signup_ids', '[]'::jsonb)) s;

  if cardinality(v_signup_ids) = 0 then
    raise exception 'A newsletter needs at least one recipient' using errcode = '22023';
  end if;

  select count(*) into v_found from email_signups where id = any (v_signup_ids);
  if v_found <> cardinality(v_signup_ids) then
    raise exception 'Some selected subscribers no longer exist' using errcode = '22023';
  end if;

  if v_id is null then
    insert into newsletters (subject, body)
    values (payload ->> 'subject', payload ->> 'body')
    returning id into v_id;
  else
    update newsletters set
      subject = payload ->> 'subject',
      body = payload ->> 'body'
    where id = v_id and status = 'draft';

    if not found then
      raise exception 'Newsletter % not found or already sent', v_id using errcode = 'P0002';
    end if;
  end if;

  delete from newsletter_recipients
  where newsletter_id = v_id and not (signup_id = any (v_signup_ids));

  insert into newsletter_recipients (newsletter_id, signup_id, email)
  select v_id, s.id, s.email
  from email_signups s
  where s.id = any (v_signup_ids)
  on conflict (newsletter_id, signup_id) do nothing;

  return v_id;
end;
$$;

revoke execute on function public.save_newsletter(jsonb) from public, anon;
grant execute on function public.save_newsletter(jsonb) to authenticated;
