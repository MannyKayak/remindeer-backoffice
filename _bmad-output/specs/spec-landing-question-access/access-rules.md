# Access rules — landing question access, phase 1 (APPLIED: migration 20260927150000)

Rows about `email_signups`, newsletters and page contents come from later migrations and are repeated here so this file shows everything anon can do. Applied, except the page contents rows (migration 20261013120000, written but not applied).

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
| audit_log, admins | no access | read (`admins`: own row only) |
| email_signups | insert only, columns `email, source, consent_text_version`; no read, update or delete (see `../spec-newsletter/data-model.md`) | read, update, delete |
| newsletters, newsletter_recipients | no access | drafts: full; sent: read |
| page_contents | no table access; reads one page via `get_page_content()` (see `../spec-page-contents/data-model.md`) | read, update |
| `page-images` storage objects | all, by public URL (public bucket) | all |
| writes | none, except the `email_signups` insert above | all |

An authenticated user who is not an admin reads `categories`, `images`, `questions`, `question_options` (including `is_correct`) and `mnemonics`, and nothing else; it writes nothing. No such account exists in phase 1.

Helpers (security definer): `is_public_question(uuid)`, `is_public_image(uuid)`, `is_public_storage_path(text)`.

## RPC

`check_answer(p_question_id uuid, p_option_id uuid) returns table(is_correct boolean, correct_option_id uuid)` — anon + authenticated; error `P0002` if question not free (and caller not admin), `22023` if option not in question.

`get_page_content(p_slug text) returns jsonb` — anon + authenticated; `null` for an unknown slug (migration 20261013120000, not applied yet).
