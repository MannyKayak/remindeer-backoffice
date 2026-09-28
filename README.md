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

Admin users are created manually in Supabase (Auth > Users). There is no public sign-up flow —
none is implemented, and none should be added.

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

## Project structure

```
src/
  providers/
    supabase-client.ts   # the only place createClient() is called
    data-provider.ts     # @refinedev/supabase dataProvider, wraps supabase-client
    auth-provider.ts      # Refine AuthProvider, wraps supabase-client.auth.*
    custom/               # escape hatch for bespoke data access (ADR-003)
  layout/
    app-sidebar.tsx        # shadcn sidebar shell, no menu items yet
    app-layout.tsx
  pages/
    login/                 # email/password login, no sign-up
    dashboard/              # placeholder post-login page
  components/ui/            # shadcn/ui components (added on demand, not preinstalled)
```

## Current state

Skeleton only: the app starts, shows the login page, authenticates against Supabase Auth, and
shows an empty dashboard behind an authenticated route guard with a sidebar that has no real
menu items yet. No table is wired up (no CRUD on `quiz_completions` or anything else).

## Known non-issue in `npm audit`

`npm audit` flags `react-router` for a CSRF bypass in **RSC mode**
(GHSA-qwww-vcr4-c8h2). This project is a plain SPA (no React Server Components, no Vite RSC
plugin), so the advisory does not apply here.
