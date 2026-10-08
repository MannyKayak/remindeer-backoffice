-- Landing "Tienimi aggiornato" form: the landing writes with the publishable
-- key (role anon), not the secret key, so anon needs an insert policy.
-- Anon can only insert the email column; it cannot read, update or delete
-- signups (the mailing list is never public). Only `email` is granted, so the
-- landing cannot set id/created_at: add columns here if the form sends more.

revoke all on public.email_signups from anon;
grant insert (email) on public.email_signups to anon;

create policy "anon insert" on public.email_signups
  for insert to anon
  with check (email = lower(btrim(email)) and length(email) <= 254);
