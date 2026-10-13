-- Page contents: editable copy of the landing pages, one row per page.
-- Spec: _bmad-output/specs/spec-page-contents/ (data-model.md)
-- The landing reads a page as one JSON document through get_page_content(),
-- server-side, and caches it. Admins edit it from the backoffice.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.page_contents (
  id uuid primary key default gen_random_uuid(),
  slug varchar(64) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger page_contents_set_updated_at
  before update on public.page_contents
  for each row execute function public.set_updated_at();

create trigger page_contents_audit
  after insert or update or delete on public.page_contents
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- RLS: admins read and update. Pages are created by migrations only (a page
-- exists in the landing code before it can have content), so no insert/delete.
-- Anon has no table access: the landing goes through get_page_content().
-- ---------------------------------------------------------------------------

alter table public.page_contents enable row level security;

revoke all on public.page_contents from anon;

create policy "admin read" on public.page_contents
  for select to authenticated using (public.is_admin());
create policy "admin update" on public.page_contents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- get_page_content: the JSON document of a page, null when the slug is unknown.
-- ---------------------------------------------------------------------------

create or replace function public.get_page_content(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select content || jsonb_build_object('updated_at', updated_at)
  from page_contents
  where slug = p_slug;
$$;

revoke execute on function public.get_page_content(text) from public;
grant execute on function public.get_page_content(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for page images. Public on purpose: the landing caches the
-- rendered page, so a signed URL (as in question-images) would expire inside
-- the cache. Objects are served by public URL; no select policy is needed.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'page-images',
  'page-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "page-images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'page-images' and public.is_admin());
create policy "page-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'page-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: the home page with the copy currently hard-coded in the landing.
-- hero_image null = the landing keeps its bundled mascot image.
-- ---------------------------------------------------------------------------

insert into public.page_contents (slug, content)
values (
  'home',
  jsonb_build_object(
    'title', 'La strada più veloce per vincere la farmacia.',
    'subtitle', '3000 domande ufficiali. Le ricordi con la mnemotecnica, non le rileggi all''infinito.',
    'cta', jsonb_build_object(
      'label', 'Prova il quiz gratis',
      'note', 'Nessuna registrazione richiesta'
    ),
    'stats', jsonb_build_array(
      jsonb_build_object('value', '3000', 'label', 'domande ufficiali'),
      jsonb_build_object('value', '2 min', 'label', 'per il quiz gratuito'),
      jsonb_build_object('value', '0', 'label', 'login richiesti')
    ),
    'hero_image', null
  )
)
on conflict (slug) do nothing;
