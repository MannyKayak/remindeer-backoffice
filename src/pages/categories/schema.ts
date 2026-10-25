import { z } from "zod";
import type { Category } from "@/types/content";

const NAME_MAX = 255;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Campo obbligatorio").max(NAME_MAX, `Massimo ${NAME_MAX} caratteri`),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const emptyCategoryForm: CategoryFormValues = { name: "" };

export const categoryToForm = (category: Category): CategoryFormValues => ({ name: category.name });

/** Postgres error code carried by a Refine HttpError (statusCode) or a raw message. */
export function hasPgCode(error: unknown, code: "23503" | "23505"): boolean {
  if (!error || typeof error !== "object") return false;
  const { statusCode, message } = error as { statusCode?: number; message?: string };
  if (statusCode === Number(code)) return true;
  const pattern = code === "23505" ? /duplicate key|unique constraint/i : /foreign key constraint/i;
  return typeof message === "string" && pattern.test(message);
}

/** Message of an Error or of a Refine HttpError (a plain object). */
export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : fallback;
}

export const usageLabel = (count: number) => (count === 1 ? "1 domanda" : `${count} domande`);
