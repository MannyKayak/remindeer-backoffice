import { supabaseClient } from "@/providers/supabase-client";
import type { Image } from "@/types/content";

const BUCKET = "question-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Uploads a file to Storage and registers it in the `images` table. */
export async function uploadImage(file: File): Promise<Image> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Formato non supportato: usa PNG, JPEG o WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Immagine troppo grande: massimo 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabaseClient
    .from("images")
    .insert({
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    await supabaseClient.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return data as Image;
}

/** Returns storage_path → signed URL for private bucket objects. */
export async function getImageUrls(storagePaths: string[]): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {};
  const { data, error } = await supabaseClient.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(error.message);

  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
