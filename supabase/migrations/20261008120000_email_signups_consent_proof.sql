-- Consent proof for mailing-list signups (GDPR art. 7(1), landing spec OQ-11).
-- Each signup records where it came from and which consent text the visitor
-- accepted; the timestamp is set by the database, never by the client.
--
-- Rows created before this migration keep all three columns null: there is no
-- proof of consent for them. The default on consent_given_at is added after the
-- column so those rows are not backfilled with a consent that was never recorded.

alter table public.email_signups
  add column source varchar(16),
  add column consent_given_at timestamptz,
  add column consent_text_version varchar(64);

alter table public.email_signups
  alter column consent_given_at set default now();

alter table public.email_signups
  add constraint email_signups_source_check
    check (source in ('landing', 'quiz')),
  add constraint email_signups_consent_text_version_check
    check (length(btrim(consent_text_version)) > 0),
  add constraint email_signups_consent_proof_check
    check ((consent_given_at is null) = (consent_text_version is null));

-- Anon may now send source and consent_text_version next to email. It still
-- cannot set id, created_at or consent_given_at, so the consent time cannot be
-- forged or backdated.
grant insert (source, consent_text_version) on public.email_signups to anon;

drop policy "anon insert" on public.email_signups;

create policy "anon insert" on public.email_signups
  for insert to anon
  with check (
    email = lower(btrim(email))
    and length(email) <= 254
    and source is not null
    and consent_text_version is not null
  );
