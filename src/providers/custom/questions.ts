import { supabaseClient } from "@/providers/supabase-client";

export type SaveQuestionPayload = {
  id?: string;
  official_number: number;
  text: string;
  image_id: string | null;
  category_id: string;
  is_free: boolean;
  options: { id?: string; text: string; is_correct: boolean }[];
  mnemonic: { text: string | null; image_id: string | null } | null;
};

/** Saves question + options + mnemonic atomically (Postgres function `save_question`). */
export async function saveQuestion(payload: SaveQuestionPayload): Promise<string> {
  const { data, error } = await supabaseClient.rpc("save_question", { payload });
  if (error) {
    if (error.code === "23505" && error.message.includes("official_number")) {
      throw new Error(`Esiste già una domanda con numero ${payload.official_number}.`);
    }
    throw new Error(error.message);
  }
  return data as string;
}
