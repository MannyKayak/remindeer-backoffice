import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabaseClient } from "@/providers/supabase-client";

export type SaveNewsletterPayload = {
  id?: string;
  subject: string;
  body: string;
  signup_ids: string[];
};

export type SendNewsletterResult = { sent: number; failed: number };

/** Saves a draft newsletter and its exact recipient set atomically (Postgres function `save_newsletter`). */
export async function saveNewsletter(payload: SaveNewsletterPayload): Promise<string> {
  const { data, error } = await supabaseClient.rpc("save_newsletter", { payload });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Sends a draft newsletter to its stored recipients (Edge Function `send-newsletter`). */
export function sendNewsletter(newsletterId: string): Promise<SendNewsletterResult> {
  return invokeSend({ newsletter_id: newsletterId });
}

/** Resends a sent newsletter only to its failed recipients (CAP-11). */
export function retryNewsletter(newsletterId: string): Promise<SendNewsletterResult> {
  return invokeSend({ newsletter_id: newsletterId, retry: true });
}

async function invokeSend(body: { newsletter_id: string; retry?: boolean }): Promise<SendNewsletterResult> {
  const { data, error } = await supabaseClient.functions.invoke<SendNewsletterResult>("send-newsletter", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  return data as SendNewsletterResult;
}
