---
id: SPEC-categories-crud
companions:
  - ../spec-questions-crud/data-model.md
  - ../../project-context.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/EXPERIENCE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Categories CRUD — Backoffice "Categorie" section

## Why

Pain. Categories exist only as two rows seeded by migration ("Tecnologia farmaceutica", "Legislazione"); the PO cannot add, rename or remove one without database access, so every question can only be filed under those two. This section gives the PO ownership of the category list and makes the question form pick from it. Minimal form of PRD FR-18 / Roadmap E3.3.

## Capabilities

- **CAP-1**
  - **intent:** Admin reaches the categories list from a "Categorie" entry in the sidebar.
  - **success:** Clicking "Categorie" opens `/categories` showing one row per category (name, number of questions using it), sorted by name, each with a pencil (edit) and red trash (delete) icon, and a "Nuova categoria" button above the list.
- **CAP-2**
  - **intent:** Admin creates a category by giving it a name.
  - **success:** Saving "Farmacologia" from "Nuova categoria" returns to the list, where it appears with 0 questions.
- **CAP-3**
  - **intent:** Admin renames an existing category in the same form used for creation, prefilled.
  - **success:** Renaming a category used by questions keeps those questions linked; the questions list shows the new name.
- **CAP-4**
  - **intent:** Admin deletes a category that no question uses.
  - **success:** Trash + confirmation removes an unused category from the list. On a category used by N questions, delete is refused with a message saying N questions use it; nothing is removed.
- **CAP-5**
  - **intent:** The question create/edit form offers every current category in its select and stores the chosen one as a reference to the category.
  - **success:** A category created via CAP-2 appears in the question form select without code changes; saving a question with it stores its `category_id` and the question shows that category in the list.
- **CAP-6**
  - **intent:** Admin cannot save an invalid category name.
  - **success:** Empty or whitespace-only names, names over 255 chars, and names matching an existing category are rejected with an inline message; no write occurs.

## Constraints

- Category has only `name` (required, ≤ 255 chars) on the existing `categories` table; no column added in this spec.
- Names are unique after trimming and ignoring case ("legislazione" clashes with "Legislazione"), enforced by a DB unique index on `lower(btrim(name))` added by a new migration, and checked in the form for an inline message.
- `questions.category_id` FK with `on delete restrict` stays: the database, not just the UI, prevents deleting a used category.
- Writes admin-only via existing RLS (`is_admin()`); every insert/update/delete already logged to `audit_log` by trigger.
- `categories` is readable by `anon` (landing): a rename is visible to the landing immediately.
- Every Supabase call through the Refine data provider or `src/providers/custom/` (ADR-003); shadcn/ui components; zod validation; same list/form/delete-confirmation patterns as the "Domande" section.

## Non-goals

- Roadmap category fields: slug, description, inclusion/exclusion criteria, order, color.
- Reassigning questions to another category during delete.
- Multiple categories per question (PRD OQ-8 stays open).
- Search, filters or pagination beyond what the questions list has.
- Classification workflow (M2 / FR-13).

## Success signal

- Logged-in admin creates "Farmacologia", assigns it to an existing question from the question edit form, renames it to "Farmacologia clinica" (the question list shows the new name), tries to delete it and is refused with "1 domanda", reassigns the question, then deletes the category — all without DB access.

## Assumptions

- Create and edit use dedicated pages (`/categories/create`, `/categories/edit/:id`), like questions, not an inline dialog.
- CAP-5 is already met by the existing question form (it lists `categories` sorted by name); work there is verification, not a new endpoint.
