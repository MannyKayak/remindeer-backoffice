---
id: SPEC-page-contents
companions:
  - data-model.md
  - ../spec-landing-question-access/access-rules.md
  - ../../project-context.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/EXPERIENCE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Page contents — Backoffice "Contenuti pagine" section

## Why

Pain. Every word on the landing home page is hard-coded in the landing repo, so changing the headline, the call to action or a number means a code change and a deploy by the technical team. This section lets the PO edit the content of each landing page from the backoffice. Only the home page exists today. The failure that matters most is a public page that renders empty or slow because its content now comes from a database: the content must reach visitors and search engines as complete HTML, as fast as the static page does today.

## Capabilities

- **CAP-1**
  - **intent:** Admin reaches a "Contenuti pagine" section from the sidebar, with one sub-entry per landing page.
  - **success:** The sidebar shows "Contenuti pagine" with the sub-entry "Home" under it; clicking "Home" (or the section itself) opens the home page editor.
- **CAP-2**
  - **intent:** Admin edits the home page title and subtitle.
  - **success:** The editor opens prefilled with the current title and subtitle; both are required; saving stores the new text.
- **CAP-3**
  - **intent:** Admin changes the home page hero image.
  - **success:** Admin uploads a PNG, JPEG or WebP up to 5 MB and sees its preview; an uploaded image requires a description (alt text); removing the image falls back to the landing's default mascot image.
- **CAP-4**
  - **intent:** Admin edits the home page call to action.
  - **success:** The button text (required) and the note under the button (optional) are editable and saved.
- **CAP-5**
  - **intent:** Admin edits the home page statistics.
  - **success:** Admin adds, edits and removes up to 4 statistics, each a value and a label, shown on the site in the listed order; with zero statistics the site shows no statistics row.
- **CAP-6**
  - **intent:** The landing gets a page's content as one JSON document from an API.
  - **success:** `get_page_content('home')` called with the publishable key returns the document described in `data-model.md`; an unknown slug returns `null`.
- **CAP-7** *(landing repo)*
  - **intent:** The home page shows the saved content without a client-side fetch.
  - **success:** View-source of the home page contains the saved title, subtitle, CTA and statistics; a save in the backoffice is visible on the site within seconds; the page still builds as static.

## Constraints

- Content is one JSON document per page, stored in `page_contents.content` and served by the RPC `get_page_content(p_slug)` (`data-model.md`). The landing reads only through the RPC; anon has no access to the table.
- The landing fetches the document on the server, caches it, and regenerates the page on demand. It never fetches page content from the browser: that would show an empty hero while loading and hide the content from search engines.
- Regeneration is triggered by a Supabase Database Webhook on `page_contents` calling a secret-protected endpoint of the landing. The backoffice SPA cannot hold a secret, so it never calls the landing directly.
- The landing keeps the current hard-coded copy and mascot image as fallback for an RPC error, a `null` result, a malformed document or a missing field. It treats the JSON as untrusted input.
- Page images live in the public bucket `page-images`, separate from the private `question-images`. Signed URLs expire after one hour and cannot live inside a cached page. Only admins upload.
- Pages are created by migration, not from the UI: a page must exist in the landing code before it can have content. Admins update, never insert or delete.
- Not editable: the CTA target (`/quiz`), the category tag above the title, the layout and the styling.
- Limits: title ≤ 120 chars, subtitle ≤ 300, CTA label ≤ 40, CTA note ≤ 80, image description ≤ 255, statistic value ≤ 12 and label ≤ 40, at most 4 statistics. Enforced by the form (zod); the database only requires a JSON object.
- Every write on `page_contents` is recorded in `audit_log` by the existing `write_audit_log()` trigger.
- shadcn/ui, Refine + Vite SPA, zod validation, ADR-003 funnel: table access through the Refine data provider, storage through `src/providers/custom/page-images.ts`.
- Schema, RPC and bucket are owned by this repo (migration `20261013120000_page_contents.sql`). The landing repo consumes the contract and creates no database objects.

## Non-goals

- Pages other than the home, and sections of the home other than the hero (comparison, email signup, footer).
- Drafts, preview before publishing, scheduled publishing, version history or rollback from the UI (the audit log keeps every past version).
- Rich text or formatting inside the fields; translations.
- A shared image library for page images, and cleanup of replaced images in the bucket.
- SEO metadata (page title, description, social image).
- Editing the CTA target or adding a second button.

## Success signal

- Admin opens Contenuti pagine → Home, changes the title, replaces the hero image, removes one statistic and saves. Within seconds the public home page shows the new title, image and two statistics, and view-source contains the new title.

## Assumptions

- "CTA" means the button text and the note under it; the target stays `/quiz`.
- An image description is required with a custom image (accessibility and SEO), although not asked for explicitly.
- Statistics are capped at 4 so the row fits the current layout.
- Saving publishes immediately; there is no draft step.
- The landing is hosted on a platform that supports on-demand regeneration. Not confirmed: a pure static export would need a rebuild on every save instead.
