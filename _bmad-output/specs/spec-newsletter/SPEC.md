---
id: SPEC-newsletter
companions:
  - data-model.md
  - ../spec-questions-crud/SPEC.md
  - ../../project-context.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-deer-backoffice-2026-08-02/EXPERIENCE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Newsletter — Backoffice "Newsletter" section

## Why

Opportunity + pain. The landing "Tienimi aggiornato" form already collects emails into `email_signups`, but the PO cannot see, correct or contact those people without DB access. This section lets the PO manage subscribers (tab **Clienti**) and write, save and send newsletters to a chosen subset of them (tab **Posta**). Sending mail to people who did not get selected is the failure that matters most: it is the one guarantee this spec is judged on.

## Capabilities

- **CAP-1**
  - **intent:** Admin reaches a "Newsletter" section from the sidebar, split into tabs Clienti and Posta.
  - **success:** Sidebar "Newsletter" opens the section on Clienti; switching to Posta and back keeps each tab's list.
- **CAP-2**
  - **intent:** Admin sees every email left in the landing signup form.
  - **success:** Clienti lists one row per `email_signups` row (email, signup date), each with pencil (edit) and red trash (delete) icons, same pattern as Domande.
- **CAP-4**
  - **intent:** Admin corrects a subscriber's email from the list.
  - **success:** Pencil opens the form prefilled; a valid email is saved; a duplicate (case-insensitive) is rejected with an inline message.
- **CAP-5**
  - **intent:** Admin removes a subscriber from the list.
  - **success:** Trash + confirmation deletes the row; the email disappears from Clienti and from the recipients of every unsent newsletter.
- **CAP-6**
  - **intent:** Admin composes a newsletter and saves it without sending.
  - **success:** "Crea una mail newsletter" above the Clienti list opens a form with subject, text body and a recipients multiselect; "Salva" stores it as draft and it appears in Posta.
- **CAP-7**
  - **intent:** Admin picks recipients one by one or all at once.
  - **success:** The multiselect lists all current subscribers; a "Seleziona tutti" option selects all, and toggled again deselects all; the saved newsletter reopens with exactly the same selection.
- **CAP-8**
  - **intent:** Admin manages newsletters and sees their send status from the Posta list.
  - **success:** Posta lists newsletters (subject, recipient count, status Bozza / In invio / Inviata / Inviata con errori with sent/failed counts, sent date); only drafts can be edited (pencil, form prefilled) and deleted (trash + confirmation).
- **CAP-9**
  - **intent:** Admin sends a newsletter from its form ("Invia") or from the Posta list.
  - **success:** After confirmation, the newsletter is delivered and its row shows the outcome and send date; a sent newsletter can no longer be edited or sent again.
- **CAP-10**
  - **intent:** Only and exactly the selected recipients receive the newsletter.
  - **success:** With 3 subscribers and 2 selected, only those 2 inboxes receive it, each as a separate message showing only its own address; the third receives nothing; each recipient receives it once even if Send is clicked twice.
- **CAP-11** *(secondary — after CAP-1…10)*
  - **intent:** Admin retries delivery to the recipients that failed.
  - **success:** On a newsletter "Inviata con errori", "Ritenta" resends only to `failed` recipients; recipients already `sent` receive nothing new; counts update.

## Constraints

- Recipients are stored explicitly per newsletter (`data-model.md`); the send reads only those rows, never "all subscribers". "Seleziona tutti" only fills the selection with the subscribers existing at that moment.
- One message per recipient, recipient alone in `To`; never CC, shared `To`, or a BCC list.
- Provider: Resend, sender domain `remindeer.it` (verified in Resend via SPF/DKIM DNS records before first send). Sending runs server-side (Supabase Edge Function, admin-checked); the Resend API key never reaches the SPA. SPA calls it through `src/providers/custom/` (ADR-003).
- Send is idempotent: status moves draft → sending → sent atomically; a second request on a newsletter not in draft is refused; each recipient is sent at most once (per-recipient status + Resend idempotency key).
- Only drafts are editable or deletable. Sent newsletters are immutable; the only allowed action is CAP-11 retry of failed recipients.
- Email: valid format, ≤ 254 chars, stored lowercase, unique case-insensitive (existing unique index on `lower(email)`). Subject required ≤ 255 chars; body required plain text; ≥ 1 recipient to save or send.
- Backoffice owns the `email_signups` schema from now on: new policies/columns go through migrations in this repo. Admin-only access via `is_admin()`; the landing's secret-key insert path keeps working.
- Every insert/update/delete on `email_signups`, `newsletters`, `newsletter_recipients` is written to `audit_log` by the existing `write_audit_log()` trigger (same as questions). Landing inserts are logged with null actor.
- shadcn/ui, Refine + Vite SPA, zod validation, ADR-003 funnel.

## Non-goals

- **TODO — manual subscriber add** by the admin: blocked on a project-level iubenda account (consent record for people who did not use the form). Must be done later.
- **TODO — unsubscribe link and consent withdrawal** (GDPR art. 7(3)): deferred with iubenda. Must be done before sending to real subscribers.
- Rich-text/HTML editor, templates, images or attachments in the body.
- Scheduled sending, open/click tracking, analytics.
- `quiz_completions.email` addresses (separate capture path, never merged with signups).
- Segments or saved recipient lists beyond the per-newsletter selection.
- Changes to the landing signup form.

## Success signal

- With subscribers A, B, C: admin edits B's email, creates a newsletter to A and C, saves it, sends it from Posta; only A and C receive one email each, B receives nothing, and the row shows "Inviata" with 2/2 sent and cannot be edited or re-sent.

## Assumptions

- Source is the existing `email_signups` table (landing Story 1.5); no new subscriber table.
- Body is plain text (textarea).
- Send asks for confirmation showing the recipient count; "Invia" from the form saves first, then sends.
- Deleting a subscriber removes them from drafts; sent newsletters keep the recipient email snapshot for history.
- Sender address `newsletter@remindeer.it`.
- The "per ora sorvoliamo" on iubenda also covers the unsubscribe link.

