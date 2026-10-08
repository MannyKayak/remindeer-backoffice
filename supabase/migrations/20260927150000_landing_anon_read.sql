-- Phase 1 landing access (spec-landing-question-access).
-- Landing visitors are `anon` (no login on the site in phase 1); `authenticated`
-- is admins only (Auth signups disabled). Anon reads free questions only and
-- never sees which option is correct: answers are checked via check_answer().
-- Revisit when landing login arrives (anon/authenticated split no longer holds).

-- ---------------------------------------------------------------------------
-- Visibility helpers (security definer: usable from storage policies, no RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_public_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from questions where id = p_question_id and is_free);
$$;

create or replace function public.is_public_image(p_image_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from questions where image_id = p_image_id and is_free)
      or exists (
        select 1
        from mnemonics m
        join questions q on q.id = m.question_id
        where m.image_id = p_image_id and q.is_free
      );
$$;

create or replace function public.is_public_storage_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from images i where i.storage_path = p_path and public.is_public_image(i.id)
  );
$$;

grant execute on function public.is_public_question(uuid) to anon, authenticated;
grant execute on function public.is_public_image(uuid) to anon, authenticated;
grant execute on function public.is_public_storage_path(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: anon is read-only, and cannot read question_options.is_correct.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate on
  public.categories, public.images, public.questions, public.question_options,
  public.mnemonics, public.audit_log, public.admins
from anon;

revoke select on public.audit_log, public.admins from anon;

revoke select on public.question_options from anon;
grant select (id, question_id, text, position) on public.question_options to anon;

-- ---------------------------------------------------------------------------
-- Anon read policies
-- ---------------------------------------------------------------------------

create policy "anon read" on public.categories
  for select to anon using (true);

create policy "anon read free" on public.questions
  for select to anon using (is_free);

create policy "anon read free" on public.question_options
  for select to anon using (public.is_public_question(question_id));

create policy "anon read free" on public.mnemonics
  for select to anon using (public.is_public_question(question_id));

create policy "anon read free" on public.images
  for select to anon using (public.is_public_image(id));

create policy "question-images anon read free" on storage.objects
  for select to anon
  using (bucket_id = 'question-images' and public.is_public_storage_path(name));

-- ---------------------------------------------------------------------------
-- check_answer: server-side answer verification.
-- ---------------------------------------------------------------------------

create or replace function public.check_answer(p_question_id uuid, p_option_id uuid)
returns table (is_correct boolean, correct_option_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_correct uuid;
begin
  if not (public.is_public_question(p_question_id) or public.is_admin()) then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from question_options where id = p_option_id and question_id = p_question_id
  ) then
    raise exception 'Option does not belong to question' using errcode = '22023';
  end if;

  select id into v_correct
  from question_options
  where question_id = p_question_id and question_options.is_correct;

  return query select v_correct = p_option_id, v_correct;
end;
$$;

revoke execute on function public.check_answer(uuid, uuid) from public;
grant execute on function public.check_answer(uuid, uuid) to anon, authenticated;
