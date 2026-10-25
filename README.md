# Remindeer Backoffice

Admin panel for Remindeer (ex Farmaconcorso), an edtech product. Separate repository from the
landing project — no code dependency between the two, just the same Supabase project as
shared backend.

Stack: [Refine](https://refine.dev) (headless) + Vite (SPA, no SSR) + shadcn/ui + Tailwind CSS +
TypeScript, with the official `@refinedev/supabase` data provider and the official
Refine-documented Supabase Auth pattern.

## Running locally

```bash
npm install
cp .env.example .env   # fill in the values, see below
npm run dev
```

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run preview` — preview the production build
- `npm run lint` — oxlint
- `npm run test:api` — API tests against the Supabase project in `.env` (see [API tests](#api-tests))

Admin users are created manually: an account in Supabase (Auth > Users), then a row in
`public.admins` for that user. An account that is not in `public.admins` cannot log in to the
backoffice and cannot write anything. There is no public sign-up flow — none is implemented,
and none should be added.

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable** key (client-side, RLS-bound) |

Uses the **publishable** key, never the secret key: this app runs entirely client-side (Vite
SPA), so anything bundled into it is public. Access control is enforced by Postgres Row Level
Security policies on the Supabase project, not by keeping the key secret. This is the same
key family as `SUPABASE_PUBLISHABLE_KEY` in the landing project's `.env` — same Supabase
project, same key, just exposed under Vite's `VITE_` prefix so it reaches the browser bundle
(the landing project's `SUPABASE_SECRET_KEY` must never be used here).

## Data access rule (ADR-003)

Same discipline as the landing project's `lib/data/`: **no component or page may call the
Supabase client directly.**

- Standard CRUD (list/show/create/edit/delete) goes through Refine's data hooks
  (`useTable`, `useList`, `useOne`, `useForm`, ...), which route through the single
  `dataProvider` configured in `src/providers/data-provider.ts`.
- Anything the generic data provider can't express (RPC calls, aggregations, storage ops) goes
  through a named function in `src/providers/custom/` — see `src/providers/custom/README.md`.
- Auth calls (`supabaseClient.auth.*`) are isolated the same way, in
  `src/providers/auth-provider.ts`.

The only file allowed to construct the Supabase client is `src/providers/supabase-client.ts`.

### Adding a future resource

Example: connecting a `quiz_completions` table as a read-only Refine resource, respecting the
funnel rule above (no manual `supabase.from(...)` in the page):

```tsx
// src/App.tsx — register the resource
resources={[
  {
    name: "quiz_completions",
    list: "/quiz-completions",
  },
]}
```

```tsx
// src/pages/quiz-completions/list.tsx
import { useTable } from "@refinedev/core";

export function QuizCompletionsList() {
  // goes through src/providers/data-provider.ts -> @refinedev/supabase, not a raw client call
  const { tableQuery } = useTable({ resource: "quiz_completions" });
  // render tableQuery.data.data ...
}
```

If a future screen needs something `useTable`/`useList` can't express (e.g. a Postgres RPC for
aggregated stats), add a named function to `src/providers/custom/` and import that from the
page — never call `supabaseClient` inline in the page itself.

## Sections

| Sidebar entry | Route | What the admin does | Spec |
|---|---|---|---|
| Dashboard | `/` | placeholder page after login | — |
| Domande | `/questions` | list, create, edit and delete questions with options, correct answer, category, images, mnemonic, free/paid flag | `spec-questions-crud` |
| Categorie | `/categories` | list categories with their question count; create, rename and delete them (delete refused while a question uses the category) | `spec-categories-crud` |
| Newsletter | `/newsletter` | tab Clienti: emails collected by the landing form; tab Posta: write, save and send newsletters to selected subscribers | `spec-newsletter` |
| Contenuti pagine → Home | `/contenuti/home` | edit the landing home page: title, subtitle, hero image, call to action, statistics | `spec-page-contents` |

Categorie needs migration `20261025120000_categories_name_ci_unique.sql` (names unique ignoring
case), written but not yet applied (as of 2026-10-25); without it duplicates differing only by
case are accepted. Applying it fails if such duplicates already exist: rename them first.

Contenuti pagine needs migration `20261013120000_page_contents.sql`, which is written but not
yet applied to the Supabase project (as of 2026-10-13); until then its page shows a load
error. The landing side that renders the saved content is not built yet.

Specs live in `_bmad-output/specs/`; `_bmad-output/project-context.md` has the decisions and
the current state of each section. `spec-landing-question-access` covers what the public
landing may read from the same database.

## Database

This repo owns the schema of the shared Supabase project. Every table, policy, function and
bucket is a migration in `supabase/migrations/`, including tables first created by the
landing. The landing repo consumes the schema and never changes it.

- Access is enforced by Row Level Security. Only users in `public.admins` write
  (`is_admin()`); landing visitors (`anon`) read free questions and page contents and can
  insert a mailing-list signup, nothing else.
- Every write on content tables is recorded in `audit_log` by a trigger.
- `supabase/functions/send-newsletter` is an Edge Function: it holds the Resend API key,
  which must never reach the SPA.
- Two image buckets: `question-images` (private, signed URLs) for questions and mnemonics,
  `page-images` (public) for landing pages.

## API tests

`npm run test:api` runs the suites in `tests/api/` against the real Supabase project in
`.env`: what an anonymous visitor, a non-admin account and an admin can and cannot do.
Without `.env.test` only the read-only anonymous suites run. Copy `.env.test.example` to
`.env.test` and fill in the test accounts to enable the suites that write data; they clean up
after themselves, and no newsletter is ever sent.

## Project structure

```
src/
  providers/
    supabase-client.ts   # the only place createClient() is called
    data-provider.ts     # @refinedev/supabase dataProvider, wraps supabase-client
    auth-provider.ts     # Refine AuthProvider, wraps supabase-client.auth.*, rejects non-admins
    custom/              # bespoke data access (ADR-003): RPCs, storage, Edge Function calls
  layout/
    app-sidebar.tsx      # sidebar menu, including sub-entries (Contenuti pagine → Home)
    app-layout.tsx
  pages/
    login/               # email/password login, no sign-up
    dashboard/           # placeholder post-login page
    questions/           # Domande: list, create, edit, shared form
    newsletter/          # Newsletter: subscribers, newsletter list, form, send dialog
    page-contents/       # Contenuti pagine: one editor per landing page (home)
  components/
    image-picker.tsx       # upload or pick an image for questions and mnemonics (private bucket)
    page-image-picker.tsx  # upload an image for a landing page (public bucket)
    ui/                    # shadcn/ui components (added on demand, not preinstalled)
  types/content.ts       # row and document types, updated by hand (ADR-004)
supabase/
  migrations/            # the schema of the shared Supabase project
  functions/             # Edge Functions (send-newsletter)
tests/api/               # API tests against the real Supabase project
```

## Known non-issue in `npm audit`

`npm audit` flags `react-router` for a CSRF bypass in **RSC mode**
(GHSA-qwww-vcr4-c8h2). This project is a plain SPA (no React Server Components, no Vite RSC
plugin), so the advisory does not apply here.
