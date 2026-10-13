import { z } from "zod";
import type { HomePageContent } from "@/types/content";

export const HOME_SLUG = "home";

export const TITLE_MAX = 120;
export const SUBTITLE_MAX = 300;
export const CTA_LABEL_MAX = 40;
export const CTA_NOTE_MAX = 80;
export const IMAGE_ALT_MAX = 255;
export const STAT_VALUE_MAX = 12;
export const STAT_LABEL_MAX = 40;
export const MAX_STATS = 4;

const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Campo obbligatorio")
    .max(max, `Massimo ${max} caratteri`);

const optionalText = (max: number) => z.string().trim().max(max, `Massimo ${max} caratteri`);

export const homeFormSchema = z
  .object({
    title: requiredText(TITLE_MAX),
    subtitle: requiredText(SUBTITLE_MAX),
    cta_label: requiredText(CTA_LABEL_MAX),
    cta_note: optionalText(CTA_NOTE_MAX),
    hero_image_path: z.string().nullable(),
    hero_image_alt: optionalText(IMAGE_ALT_MAX),
    stats: z
      .array(
        z.object({
          value: requiredText(STAT_VALUE_MAX),
          label: requiredText(STAT_LABEL_MAX),
        }),
      )
      .max(MAX_STATS, `Massimo ${MAX_STATS} statistiche`),
  })
  .superRefine((values, ctx) => {
    if (values.hero_image_path && !values.hero_image_alt) {
      ctx.addIssue({
        code: "custom",
        path: ["hero_image_alt"],
        message: "Descrivi l'immagine per chi usa uno screen reader",
      });
    }
  });

export type HomeFormValues = z.infer<typeof homeFormSchema>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Tolerant read of the stored JSON: a missing or malformed field becomes an empty one. */
export function homeContentToForm(content: unknown): HomeFormValues {
  const root = record(content);
  const cta = record(root.cta);
  const heroImage = record(root.hero_image);
  const stats = Array.isArray(root.stats) ? root.stats : [];
  return {
    title: text(root.title),
    subtitle: text(root.subtitle),
    cta_label: text(cta.label),
    cta_note: text(cta.note),
    hero_image_path: text(heroImage.path) || null,
    hero_image_alt: text(heroImage.alt),
    stats: stats.slice(0, MAX_STATS).map((stat) => {
      const item = record(stat);
      return { value: text(item.value), label: text(item.label) };
    }),
  };
}

export function homeFormToContent(values: HomeFormValues): HomePageContent {
  return {
    title: values.title,
    subtitle: values.subtitle,
    cta: { label: values.cta_label, note: values.cta_note },
    stats: values.stats,
    hero_image: values.hero_image_path
      ? { path: values.hero_image_path, alt: values.hero_image_alt }
      : null,
  };
}
