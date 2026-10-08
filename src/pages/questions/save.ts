import { saveQuestion } from "@/providers/custom/questions";
import type { QuestionFormValues } from "./schema";

export function saveQuestionForm(values: QuestionFormValues, id?: string) {
  return saveQuestion({
    id,
    official_number: Number(values.official_number),
    text: values.text,
    image_id: values.image_id,
    category_id: values.category_id,
    is_free: values.is_free,
    options: values.options.map((option, index) => ({
      id: option.id,
      text: option.text,
      is_correct: index === values.correct_index,
    })),
    mnemonic: values.has_mnemonic
      ? { text: values.mnemonic_text || null, image_id: values.mnemonic_image_id }
      : null,
  });
}

export const QUESTION_DETAIL_SELECT =
  "*, categories(name), question_options(*), mnemonics(*)";
