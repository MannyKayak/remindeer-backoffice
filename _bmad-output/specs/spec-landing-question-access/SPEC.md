---
id: SPEC-landing-question-access
companions:
  - access-rules.md
  - ../spec-questions-crud/data-model.md
  - ../../project-context.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Landing access to questions (DB side)

## Why

Opportunity + safety. Questions now exist (spec-questions-crud) but the public landing, on the same Supabase project, cannot read them safely: RLS currently lets any logged-in user read everything, anon nothing, and the correct answer travels to the client. This spec defines what the landing may read and how an answer is checked, so the landing can go live on free questions without leaking answers or premium content.

## Capabilities

- **CAP-1**
  - **intent:** Landing visitors (anon, phase 1 has no site login) can read free questions with their options, category and mnemonic.
  - **success:** With the anon key, selecting `questions` returns only `is_free = true` rows, with embedded options and mnemonic; premium rows never appear.
- **CAP-2**
  - **intent:** A user checks whether a chosen option is correct without ever receiving the correct answer beforehand.
  - **success:** `rpc('check_answer', {question_id, option_id})` returns `{is_correct, correct_option_id}` for a visible question; no table or column readable by anon/non-admin exposes correctness.
- **CAP-3**
  - **intent:** Users can display images of questions and mnemonics they are allowed to see.
  - **success:** Anon can create signed URLs for images linked to free questions; images of premium questions are refused.
- **CAP-4**
  - **intent:** Backoffice keeps working unchanged for admins.
  - **success:** Admin list, create, edit (incl. correct-answer confirmation) and delete behave as before, including premium questions.

## Constraints

- All schema changes are migrations in this (backoffice) repo; the landing repo never pushes migrations.
- Correctness must not be selectable by anon in any table, view or embed (column grant on `question_options`).
- Phase 1: `authenticated` = admins only; Auth signups disabled in Supabase dashboard. Landing login in a later phase invalidates this and requires redesign.
- Writes remain admin-only (migration 20260927140000).
- Premium questions: invisible to anon; entitlement model deferred to later phases.
- Landing reads through its own `lib/data/` funnel (ADR-003); types regenerated manually (ADR-004).

## Non-goals

- Landing login, entitlement / premium subscription model and Stripe (later phases).
- Landing UI and its `lib/data/` code (landing repo, separate prompt).
- Answer statistics, attempts (`tentativo`, `risposta_tentativo`).
- Rate limiting of `check_answer`.

## Success signal

- From an anon client: free questions #953 list with options and mnemonic, `is_correct` unavailable, `check_answer(953, "ogni 5 anni")` → correct, #3000 (premium) invisible; the backoffice still edits both.

## Assumptions

- Option order shuffling and its persistence are landing-side concerns.
- `check_answer` on a non-visible question returns an error, not a result.
