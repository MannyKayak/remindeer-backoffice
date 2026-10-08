# Access rules — landing question access, phase 1 (APPLIED: migration 20260927150000)

Phase 1: no login on the landing. Roles map to people:
- `anon` = landing visitors
- `authenticated` = backoffice admins only (Auth signups disabled in the Supabase dashboard)

When landing login arrives, this split breaks (users become `authenticated`) and correctness hiding must be redesigned.

## Visibility

| object | anon | admin |
|---|---|---|
| questions | `is_free` only | all, full CRUD |
| question_options | of free questions; columns `id, question_id, text, position` only (no `is_correct`, `select *` fails) | all |
| mnemonics | of free questions | all |
| categories | all | all |
| images row + storage object | linked to a free question or its mnemonic | all |
| audit_log, admins | no access | read |
| writes | none | all |

Helpers (security definer): `is_public_question(uuid)`, `is_public_image(uuid)`, `is_public_storage_path(text)`.

## RPC

`check_answer(p_question_id uuid, p_option_id uuid) returns table(is_correct boolean, correct_option_id uuid)` — anon + authenticated; error `P0002` if question not free (and caller not admin), `22023` if option not in question.
