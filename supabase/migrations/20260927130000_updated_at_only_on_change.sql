-- Bump updated_at only when the row actually changes, so saving a question whose
-- own fields are untouched (e.g. only the mnemonic changed) does not write a
-- spurious 'update' entry to audit_log.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
