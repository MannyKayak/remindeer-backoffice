-- Base schema for newsletter subscriptions.
-- Must exist before the newsletter migration.

create table if not exists public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Protect subscriber data from public access.
alter table public.email_signups enable row level security;

-- Existing newsletter migrations will add
-- admin access, anonymous insert and consent metadata.