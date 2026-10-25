---
title: 'Categories CRUD — backoffice "Categorie" section'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: 'f0dda0b5781000fc3dd33c698baf3e46ae57af7e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-categories-crud/SPEC.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Categories live only as two seeded rows in `public.categories`; the PO cannot add, rename or delete one without DB access, so the question form select is stuck with those two.

**Approach:** Add a "Categorie" section (sidebar → `/categories`) with list (name + question count), create, edit (rename) and delete, on the existing table. Add a case-insensitive unique index by migration. The question form already lists categories from the DB; verify a new one shows up there.

## Boundaries & Constraints

**Always:** Only `name` (required, trimmed, ≤ 255). Uniqueness ignores case and surrounding spaces, enforced by a DB unique index on `lower(btrim(name))`; the form shows the DB duplicate error inline under the field. `questions.category_id` FK stays `on delete restrict`. All data access through the Refine data provider (ADR-003); shadcn/ui; zod; same list/form/confirm patterns and Italian copy as "Domande". Writes stay admin-only via existing RLS; audit trigger already covers `categories`.

**Ask First:** Pushing the migration to the remote Supabase project. Any change to RLS, the FK, or the question form beyond verification.

**Never:** New columns (slug, description, criteria, order, color). Reassigning questions on delete. Multi-category questions. Pagination/search on the categories list. Calling `supabaseClient` from pages.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | name "Farmacologia" | Row inserted, back to list, count 0, toast | N/A |
| Blank name | "   " | Inline "Campo obbligatorio", no request | zod |
| Too long | 256 chars | Inline "Massimo 255 caratteri", no request | zod |
| Duplicate | " legislazione " with "Legislazione" existing | Inline "Esiste già una categoria con questo nome" | DB 23505 mapped in form |
| Rename used | category with questions → new name | Questions keep `category_id`, list shows new name | N/A |
| Delete unused | count 0, confirm | Row removed, toast | N/A |
| Delete used | count N > 0 | Dialog says N domande use it, no delete action offered | DB 23503 (race) → toast with same message |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260927120000_questions_crud.sql` -- `categories` table, FK restrict, audit trigger, seed
- `src/App.tsx` -- Refine `resources` + routes; add `categories`
- `src/layout/app-sidebar.tsx` -- nav items array; add "Categorie"
- `src/pages/questions/{list,create,edit,page-header}.tsx` -- patterns to copy (table, AlertDialog, PageHeader, toast, invalidate)
- `src/pages/questions/question-form.tsx` -- `useList("categories")` select (verify only)
- `src/pages/newsletter/subscriber-list.tsx` -- pattern: map 23505 to `setError`
- `src/types/content.ts` -- `Category` type
- `tests/api/helpers.ts`, `tests/api/questions.test.ts` -- API test pattern (vitest, `hasAdmin`, cleanup)

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261025120000_categories_name_ci_unique.sql` -- `create unique index categories_name_ci_key on public.categories (lower(btrim(name)))` -- DB-level case-insensitive uniqueness
- [x] `src/pages/categories/schema.ts` -- zod `categoryFormSchema` (name trimmed, 1–255), empty defaults -- shared create/edit validation
- [x] `src/pages/categories/category-form.tsx` -- Card form, one Name field, submit/cancel; parent passes `onSubmit` that may throw; map duplicate error to `setError("name")` -- single form for CAP-2/3/6
- [x] `src/pages/categories/{create,edit}.tsx` -- `useCreate`/`useUpdate` + `useOne`, toast, `go("/categories")`; reuse `PageHeader` from questions -- CAP-2/3
- [x] `src/pages/categories/list.tsx` -- `useList` select `id, name, questions(count)`, pagination off, sort name asc; columns Nome, Domande, Azioni; delete dialog branches on count; map 23503 on error -- CAP-1/4
- [x] `src/pages/categories/index.ts` -- exports
- [x] `src/App.tsx` -- resource `categories` (list/create/edit, label "Categorie") + routes
- [x] `src/layout/app-sidebar.tsx` -- "Categorie" after "Domande", lucide `TagsIcon`
- [x] `tests/api/categories.test.ts` -- admin: create, case/space duplicate → 23505, rename keeps question link, delete used → 23503, delete unused ok; anon insert refused; cleanup
- [x] `README.md`, `_bmad-output/project-context.md` -- add section row; status "implementata"

**Acceptance Criteria:**
- Given an admin, when they click "Categorie" in the sidebar, then `/categories` lists every category sorted by name with its question count and edit/delete icons.
- Given a category created in "Categorie", when the admin opens question create/edit, then it appears in the category select and saving stores its id.
- Given a category edit, when saved, then the question list shows the new name.

## Verification

**Commands:**
- `npm run build` -- expected: no type errors
- `npm run lint` -- expected: no errors
- `npm run test:api` -- expected: categories suite passes (after migration applied)

**Manual checks (if no CLI):**
- Run SPEC success signal in browser: create "Farmacologia", assign to a question, rename, delete refused with "1 domanda", reassign, delete.

## Suggested Review Order

**Delete guard (the risky path)**

- Entry point: dialog branches on question count; used category gets no "Elimina" action.
  [`list.tsx:175`](../../src/pages/categories/list.tsx#L175)

- FK `on delete restrict` race fallback mapped to an Italian toast.
  [`list.tsx:65`](../../src/pages/categories/list.tsx#L65)

- Count via PostgREST embedded aggregate, no extra query.
  [`list.tsx:33`](../../src/pages/categories/list.tsx#L33)

- Separate open flag keeps dialog content stable during close animation.
  [`list.tsx:47`](../../src/pages/categories/list.tsx#L47)

**Uniqueness ignoring case**

- DB index is the guarantee; the form only maps its error.
  [`20261025120000_categories_name_ci_unique.sql:3`](../../supabase/migrations/20261025120000_categories_name_ci_unique.sql#L3)

- 23505 shown inline under the name field.
  [`category-form.tsx:32`](../../src/pages/categories/category-form.tsx#L32)

- Reads Postgres code from Refine HttpError (plain object, not Error).
  [`schema.ts:17`](../../src/pages/categories/schema.ts#L17)

- zod: trimmed, 1–255 chars.
  [`schema.ts:6`](../../src/pages/categories/schema.ts#L6)

**Create / rename**

- Rename invalidates questions so their embedded category name refreshes.
  [`edit.tsx:47`](../../src/pages/categories/edit.tsx#L47)

- Create via data provider; Refine invalidates `categories` list, so question select updates.
  [`create.tsx:20`](../../src/pages/categories/create.tsx#L20)

**Wiring**

- Resource registration.
  [`App.tsx:45`](../../src/App.tsx#L45)

- Routes.
  [`App.tsx:92`](../../src/App.tsx#L92)

- Sidebar entry after "Domande".
  [`app-sidebar.tsx:39`](../../src/layout/app-sidebar.tsx#L39)

**Tests and docs**

- Case/space duplicate refused by DB; leaked rows tracked for cleanup.
  [`categories.test.ts:30`](../../tests/api/categories.test.ts#L30)

- Rename keeps link, count = 1, delete refused 23503.
  [`categories.test.ts:42`](../../tests/api/categories.test.ts#L42)

- Migration status and apply caveat.
  [`README.md:99`](../../README.md#L99)
