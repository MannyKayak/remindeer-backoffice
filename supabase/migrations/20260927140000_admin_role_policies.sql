-- Admin role: landing end users share this Supabase project and are also
-- `authenticated`, so "authenticated = admin" is not safe.
-- Rule: every authenticated user can read content; only admins can create,
-- update or delete it. Admins are added manually by the technical team
-- (no self-signup):
--   insert into public.admins (user_id) values ('<auth.users.id>');

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A user may only see their own admin row (used by the backoffice login check).
create policy "read own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;



-- ---------------------------------------------------------------------------
-- Content tables: read for authenticated users, write for admins only.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'images', 'questions', 'question_options', 'mnemonics']
  loop
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated read" on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format(
      'create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format(
      'create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- Audit log: admins only.
drop policy if exists "authenticated read" on public.audit_log;
create policy "admin read" on public.audit_log
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- save_question: fail fast with a clear message for non-admins
-- (RLS would block the writes anyway).
-- ---------------------------------------------------------------------------

create or replace function public.save_question(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(payload ->> 'id', '')::uuid;
  v_options jsonb := coalesce(payload -> 'options', '[]'::jsonb);
  v_mnemonic jsonb := payload -> 'mnemonic';
  v_option_count int := jsonb_array_length(v_options);
  v_correct_count int;
  v_keep_ids uuid[];
  v_opt record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can save questions' using errcode = '42501';
  end if;

  if v_option_count < 2 or v_option_count > 10 then
    raise exception 'A question needs between 2 and 10 options (got %)', v_option_count
      using errcode = '22023';
  end if;

  select count(*) into v_correct_count
  from jsonb_array_elements(v_options) o
  where (o ->> 'is_correct')::boolean;

  if v_correct_count <> 1 then
    raise exception 'A question needs exactly one correct option (got %)', v_correct_count
      using errcode = '22023';
  end if;

  if v_id is null then
    insert into questions (official_number, text, image_id, category_id, is_free)
    values (
      (payload ->> 'official_number')::int,
      payload ->> 'text',
      nullif(payload ->> 'image_id', '')::uuid,
      (payload ->> 'category_id')::uuid,
      coalesce((payload ->> 'is_free')::boolean, false)
    )
    returning id into v_id;
  else
    update questions set
      official_number = (payload ->> 'official_number')::int,
      text = payload ->> 'text',
      image_id = nullif(payload ->> 'image_id', '')::uuid,
      category_id = (payload ->> 'category_id')::uuid,
      is_free = coalesce((payload ->> 'is_free')::boolean, false)
    where id = v_id;

    if not found then
      raise exception 'Question % not found', v_id using errcode = 'P0002';
    end if;
  end if;

  -- Options: delete removed, update kept (non-correct first so the
  -- one-correct index never sees two trues), insert new.
  select coalesce(array_agg((o ->> 'id')::uuid), '{}')
  into v_keep_ids
  from jsonb_array_elements(v_options) o
  where nullif(o ->> 'id', '') is not null;

  delete from question_options
  where question_id = v_id and not (id = any (v_keep_ids));

  for v_opt in
    select o.value as opt, o.ordinality::smallint as pos
    from jsonb_array_elements(v_options) with ordinality o
    where nullif(o.value ->> 'id', '') is not null
    order by (o.value ->> 'is_correct')::boolean
  loop
    update question_options set
      text = v_opt.opt ->> 'text',
      is_correct = (v_opt.opt ->> 'is_correct')::boolean,
      position = v_opt.pos
    where id = (v_opt.opt ->> 'id')::uuid and question_id = v_id;

    if not found then
      raise exception 'Option % does not belong to question %', v_opt.opt ->> 'id', v_id
        using errcode = '22023';
    end if;
  end loop;

  insert into question_options (question_id, text, is_correct, position)
  select v_id, o.value ->> 'text', (o.value ->> 'is_correct')::boolean, o.ordinality::smallint
  from jsonb_array_elements(v_options) with ordinality o
  where nullif(o.value ->> 'id', '') is null;

  -- Mnemonic: null payload removes it.
  if v_mnemonic is null or jsonb_typeof(v_mnemonic) = 'null' then
    delete from mnemonics where question_id = v_id;
  else
    insert into mnemonics (question_id, text, image_id)
    values (
      v_id,
      nullif(btrim(v_mnemonic ->> 'text'), ''),
      nullif(v_mnemonic ->> 'image_id', '')::uuid
    )
    on conflict (question_id) do update set
      text = excluded.text,
      image_id = excluded.image_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_question(jsonb) from public, anon;
grant execute on function public.save_question(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: everyone authenticated reads, only admins upload/delete.
-- ---------------------------------------------------------------------------

drop policy if exists "question-images authenticated insert" on storage.objects;
drop policy if exists "question-images authenticated delete" on storage.objects;

create policy "question-images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());
create policy "question-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images' and public.is_admin());
