import { supabaseClient } from "@/providers/supabase-client";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./images";

const BUCKET = "page-images";

/** Uploads a file to the public page-images bucket and returns its object path. */
export async function uploadPageImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Formato non supportato: usa PNG, JPEG o WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Immagine troppo grande: massimo 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

/** Public URL of an object in the page-images bucket (no signing: the bucket is public). */
export function pageImageUrl(path: string): string {
  return supabaseClient.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
