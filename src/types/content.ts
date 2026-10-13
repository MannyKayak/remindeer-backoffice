export type Category = {
  id: string;
  name: string;
};

export type Image = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  position: number;
};

export type Mnemonic = {
  id: string;
  question_id: string;
  text: string | null;
  image_id: string | null;
};

export type Question = {
  id: string;
  official_number: number;
  text: string;
  image_id: string | null;
  category_id: string;
  is_free: boolean;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "name"> | null;
  question_options?: QuestionOption[];
  mnemonics?: Mnemonic | Mnemonic[] | null;
};

/** PostgREST embeds a unique FK (mnemonics.question_id) as object; older versions as array. */
export function firstMnemonic(value: Question["mnemonics"]): Mnemonic | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type EmailSignup = {
  id: string;
  email: string;
  created_at: string;
  /** Consent proof, written by the landing form. All null on signups older than the proof columns. */
  source: "landing" | "quiz" | null;
  consent_given_at: string | null;
  consent_text_version: string | null;
};

/** JSON document of the home page, as served to the landing by get_page_content('home'). */
export type HomePageContent = {
  title: string;
  subtitle: string;
  cta: { label: string; note: string };
  stats: { value: string; label: string }[];
  /** `path` is an object path in the public `page-images` bucket; null = landing default image. */
  hero_image: { path: string; alt: string } | null;
};

export type PageContent = {
  id: string;
  slug: string;
  /** Shape depends on the page; read it through the page's own parser. */
  content: unknown;
  updated_at: string;
};

export type NewsletterStatus ="draft" | "sending" | "sent";
export type DeliveryStatus = "pending" | "sent" | "failed";

export type NewsletterRecipient = {
  id: string;
  newsletter_id: string;
  signup_id: string | null;
  email: string;
  delivery_status: DeliveryStatus;
  delivered_at: string | null;
  error: string | null;
};

export type Newsletter = {
  id: string;
  subject: string;
  body: string;
  status: NewsletterStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  newsletter_recipients?: Pick<NewsletterRecipient, "signup_id" | "delivery_status">[];
};
