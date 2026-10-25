---
id: SPEC-questions-crud
companions:
  - data-model.md
  - ../../project-context.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/EXPERIENCE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Questions CRUD — Backoffice "Domande" section

## Why

Pain + vision. The PO can log in but cannot yet manage any content; questions are the root entity every other feature (mnemonics, classification, free set) hangs off. This section lets the PO create, read, update and delete questions — options, correct answer, category, optional images and mnemonic (text and/or image) — without touching the database. Realizes PRD FR-11 (basic list) and FR-12 (edit), minimal form of FR-14.

## Capabilities

- **CAP-1**
  - **intent:** Admin reaches the questions list from a "Domande" entry in the sidebar; list is the section's default page.
  - **success:** Clicking "Domande" opens `/questions` showing one row per question (number, text, category, correct answer, free/paid, a marker when it has a mnemonic), sorted by official number, 20 per page, each with a pencil (edit) and red trash (delete) icon.
- **CAP-2**
  - **intent:** Admin creates a question with every field a question can have.
  - **success:** From "Nuova domanda" above the list, both example questions (#3000, #953) can be entered and saved and then appear in the list.
- **CAP-3**
  - **intent:** Admin edits an existing question in the same form used for creation, prefilled with its current values.
  - **success:** Pencil opens the form with all fields (options, correct answer, images, mnemonic, category) populated; saving persists changes.
- **CAP-4**
  - **intent:** Admin deletes a question.
  - **success:** Trash + confirmation removes the question with its options and mnemonic; it disappears from the list.
- **CAP-5**
  - **intent:** Admin attaches images (question image, mnemonic image) by uploading a new file or picking one already stored.
  - **success:** Uploaded file shows as preview in the form, is stored, and is shown again when the question is reopened.
- **CAP-7**
  - **intent:** Admin marks each question as free (visible without payment) or paid.
  - **success:** Toggle in the form persists `is_free`; list shows the state; new questions default to paid.
- **CAP-6**
  - **intent:** Admin cannot save invalid data.
  - **success:** zod rejects missing required fields and over-length text with inline messages; no request is sent.

## Constraints

- Text limits: question text ≤ 500 chars; every other text field ≤ 255 chars. Enforced in zod and in DB column types.
- Required: official number (positive integer, unique), question text, category, free/paid flag (default paid), 2 to 10 options (count varies per question, form adds/removes rows), all options' text, exactly one correct option. Optional: question image, mnemonic. A mnemonic, if present, needs text or image (or both).
- Answer options are addressed by id, never by position (Roadmap §3).
- Changing the correct answer of an existing question requires an explicit confirmation separate from Save (project-context).
- Every insert/update/delete on questions, options, mnemonics, categories, images is written to `audit_log` (actor, action, before/after) by DB trigger (PRD FR-3). An update that changes nothing writes no entry and does not bump `updated_at` (migration 20260927130000). Audit viewer page is out of scope.
- Writes are admin-only: an admin is a user listed in `public.admins`, checked by `is_admin()` (migration 20260927140000). The backoffice login rejects accounts that are not admins. Admins are added manually by the technical team.
- Components from shadcn/ui; Refine + Vite SPA; zod for validation.
- Every Supabase call goes through the Refine data provider or `src/providers/custom/` (ADR-003). No secret key in the SPA.
- Schema per `data-model.md`, approved 2026-09-27 and applied.

## Non-goals

- Import of the 3000 questions (FR-4/5/6).
- Categories CRUD (FR-18) — owned by `../spec-categories-crud/`.
- Mnemonic variants, style, publication workflow (FR-15/16).
- Question status / draft state; search/filters beyond basic list (rest of FR-11).
- Warning for free questions without mnemonic (FR-25).
- Roles/permission differentiation (FR-2).

## Success signal

- Logged-in admin enters #3000 (with mnemonic image + text) and #953 (text-only mnemonic) via the UI, reopens both with all fields prefilled, edits one, deletes the other — without any direct DB access.

## Assumptions

- Delete asks for confirmation; images stay in the `images` table after the question is deleted.
- Categories "Tecnologia farmaceutica" and "Legislazione" seeded by migration; further ones managed in the "Categorie" section (`../spec-categories-crud/`); form uses a select listing all categories.
- PRD OQ-1 is resolved as option (a): publishable key in the SPA, access enforced by RLS. Any authenticated user reads the content tables; only admins write. Anon access for the landing is defined in `../spec-landing-question-access/`.
- One mnemonic per question for now; table already separate so variants can come later.
- Single category per question (PRD OQ-8 left open; migration to many-to-many possible later).

