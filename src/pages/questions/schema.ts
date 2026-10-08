import { z } from "zod";
import { firstMnemonic, type Question } from "@/types/content";

const TEXT_MAX = 255;
const QUESTION_TEXT_MAX = 500;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;

const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Campo obbligatorio")
    .max(max, `Massimo ${max} caratteri`);

export const questionFormSchema = z
  .object({
    official_number: z
      .string()
      .trim()
      .min(1, "Campo obbligatorio")
      .regex(/^\d+$/, "Inserisci un numero intero positivo")
      .refine((v) => Number(v) > 0 && Number(v) <= 2147483647, "Numero non valido"),
    text: requiredText(QUESTION_TEXT_MAX),
    image_id: z.string().nullable(),
    category_id: z.string().min(1, "Seleziona una categoria"),
    is_free: z.boolean(),
    options: z
      .array(
        z.object({
          id: z.string().optional(),
          text: requiredText(TEXT_MAX),
        }),
      )
      .min(MIN_OPTIONS, `Servono almeno ${MIN_OPTIONS} risposte`)
      .max(MAX_OPTIONS, `Massimo ${MAX_OPTIONS} risposte`),
    correct_index: z.number().int().min(0, "Seleziona la risposta corretta"),
    has_mnemonic: z.boolean(),
    mnemonic_text: z.string().trim().max(TEXT_MAX, `Massimo ${TEXT_MAX} caratteri`),
    mnemonic_image_id: z.string().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.correct_index >= values.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["correct_index"],
        message: "Seleziona la risposta corretta",
      });
    }
    if (values.has_mnemonic && !values.mnemonic_text && !values.mnemonic_image_id) {
      ctx.addIssue({
        code: "custom",
        path: ["mnemonic_text"],
        message: "Inserisci un testo o un'immagine per la mnemotecnica",
      });
    }
  });

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

export const emptyQuestionForm: QuestionFormValues = {
  official_number: "",
  text: "",
  image_id: null,
  category_id: "",
  is_free: false,
  options: Array.from({ length: 5 }, () => ({ text: "" })),
  correct_index: -1,
  has_mnemonic: false,
  mnemonic_text: "",
  mnemonic_image_id: null,
};

export function questionToForm(question: Question): QuestionFormValues {
  const options = [...(question.question_options ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const mnemonic = firstMnemonic(question.mnemonics);
  return {
    official_number: String(question.official_number),
    text: question.text,
    image_id: question.image_id,
    category_id: question.category_id,
    is_free: question.is_free,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    correct_index: options.findIndex((o) => o.is_correct),
    has_mnemonic: mnemonic !== null,
    mnemonic_text: mnemonic?.text ?? "",
    mnemonic_image_id: mnemonic?.image_id ?? null,
  };
}
