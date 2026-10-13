# providers/custom

Escape hatch for data access that Refine's generic Supabase `dataProvider` doesn't cover well:
RPC calls, multi-table aggregations, storage operations, etc.

Rule (ADR-003, same discipline as the landing project's `lib/data/`): no component or page
may call `supabaseClient` directly. Generic CRUD goes through `useTable`/`useList`/`useOne`/...
via the standard Refine `dataProvider` (`src/providers/data-provider.ts`). Anything the standard
provider can't express goes through a **named function in this folder**, imported by the
component — never a raw `supabaseClient.from(...)` call inline in a page.

Minimal conforming example:

```ts
// src/providers/custom/quiz-stats.ts
import { supabaseClient } from "@/providers/supabase-client";

export async function getQuizCompletionStats(courseId: string) {
  const { data, error } = await supabaseClient.rpc("quiz_completion_stats", {
    course_id: courseId,
  });
  if (error) throw new Error(error.message);
  return data;
}
```

```tsx
// src/pages/dashboard/index.tsx
import { getQuizCompletionStats } from "@/providers/custom/quiz-stats";
```

## What is here

| File | Why it cannot go through the data provider |
|---|---|
| `questions.ts` | `save_question` RPC: saves a question, its options and its mnemonic in one transaction |
| `images.ts` | Storage: upload to the private `question-images` bucket, register the file in `images`, create signed URLs |
| `newsletters.ts` | `save_newsletter` RPC (draft plus exact recipient set) and the `send-newsletter` Edge Function |
| `page-images.ts` | Storage: upload to the public `page-images` bucket and build public URLs |
