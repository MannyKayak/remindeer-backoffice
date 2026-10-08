import { z } from "zod";
import type { Newsletter } from "@/types/content";

export const EMAIL_MAX = 254;
export const SUBJECT_MAX = 255;

export const subscriberFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Campo obbligatorio")
    .max(EMAIL_MAX, `Massimo ${EMAIL_MAX} caratteri`)
    .email("Email non valida")
    .transform((v) => v.toLowerCase()),
});

export type SubscriberFormInput = z.input<typeof subscriberFormSchema>;
export type SubscriberFormValues = z.output<typeof subscriberFormSchema>;

export const newsletterFormSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Campo obbligatorio")
    .max(SUBJECT_MAX, `Massimo ${SUBJECT_MAX} caratteri`),
  body: z.string().trim().min(1, "Campo obbligatorio"),
  signup_ids: z.array(z.string()).min(1, "Seleziona almeno un destinatario"),
});

export type NewsletterFormValues = z.infer<typeof newsletterFormSchema>;

export const emptyNewsletterForm: NewsletterFormValues = {
  subject: "",
  body: "",
  signup_ids: [],
};

export function newsletterToForm(newsletter: Newsletter): NewsletterFormValues {
  return {
    subject: newsletter.subject,
    body: newsletter.body,
    signup_ids: (newsletter.newsletter_recipients ?? [])
      .map((r) => r.signup_id)
      .filter((id): id is string => id !== null),
  };
}

export type SendSummary = {
  label: "Bozza" | "In invio" | "Inviata" | "Inviata con errori";
  total: number;
  sent: number;
  failed: number;
};

export function sendSummary(newsletter: Newsletter): SendSummary {
  const recipients = newsletter.newsletter_recipients ?? [];
  const sent = recipients.filter((r) => r.delivery_status === "sent").length;
  const failed = recipients.filter((r) => r.delivery_status === "failed").length;
  const total = recipients.length;
  const label =
    newsletter.status === "draft"
      ? "Bozza"
      : newsletter.status === "sending"
        ? "In invio"
        : failed > 0
          ? "Inviata con errori"
          : "Inviata";
  return { label, total, sent, failed };
}

const dateTimeFormat = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}
