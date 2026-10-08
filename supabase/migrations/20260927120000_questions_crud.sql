-- Questions CRUD: categories, images, questions, question_options, mnemonics, audit_log.
-- Spec: _bmad-output/specs/spec-questions-crud/ (data-model.md)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique,
  created_at timestamptz not null default now()
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  storage_path varchar(255) not null unique,
  file_name varchar(255) not null,
  mime_type varchar(255) not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  official_number integer not null unique check (official_number > 0),
  text varchar(500) not null check (length(btrim(text)) > 0),
  image_id uuid references public.images (id) on delete set null,
  category_id uuid not null references public.categories (id) on delete restrict,
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_category_id_idx on public.questions (category_id);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  text varchar(255) not null check (length(btrim(text)) > 0),
  is_correct boolean not null default false,
  position smallint not null check (position > 0),
  constraint question_options_position_unique
    unique (question_id, position) deferrable initially deferred
);

-- At most one correct option per question ("exactly one" enforced in save_question).
create unique index question_options_one_correct_idx
  on public.question_options (question_id)
  where is_correct;

create table public.mnemonics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  text varchar(255),
  image_id uuid references public.images (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mnemonics_text_or_image check (
    (text is not null and length(btrim(text)) > 0) or image_id is not null
  )
);

create trigger mnemonics_set_updated_at
  before update on public.mnemonics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log (PRD FR-3): every write on question content is recorded.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid default auth.uid(),
  action varchar(16) not null check (action in ('insert', 'update', 'delete')),
  table_name varchar(255) not null,
  record_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, action, table_name, record_id, new_data)
    values (auth.uid(), 'insert', tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) = to_jsonb(old) then
      return new;
    end if;
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), 'update', tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data)
    values (auth.uid(), 'delete', tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger questions_audit
  after insert or update or delete on public.questions
  for each row execute function public.write_audit_log();

create trigger question_options_audit
  after insert or update or delete on public.question_options
  for each row execute function public.write_audit_log();

create trigger mnemonics_audit
  after insert or update or delete on public.mnemonics
  for each row execute function public.write_audit_log();

create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.write_audit_log();

create trigger images_audit
  after insert or update or delete on public.images
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- Atomic save of question + options + mnemonic
-- payload: {
--   id?: uuid, official_number, text, image_id?, category_id, is_free,
--   options: [{ id?: uuid, text, is_correct }]   -- order = position
--   mnemonic: null | { text?: string, image_id?: uuid }
-- }
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
-- RLS: admins are the only authenticated users (no self-signup).
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.images enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.mnemonics enable row level security;
alter table public.audit_log enable row level security;

create policy "authenticated full access" on public.categories
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.images
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.questions
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.question_options
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.mnemonics
  for all to authenticated using (true) with check (true);

-- Audit log is read-only for admins; rows are written only by the trigger.
create policy "authenticated read" on public.audit_log
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for question and mnemonic images (private).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "question-images authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'question-images');
create policy "question-images authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'question-images');
create policy "question-images authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'question-images');

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into public.categories (name) values
  ('Tecnologia farmaceutica'),
  ('Legislazione')
on conflict (name) do nothing;
