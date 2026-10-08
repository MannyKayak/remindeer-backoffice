import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInvalidate, useList } from "@refinedev/core";
import { Loader2Icon, SaveIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveNewsletter } from "@/providers/custom/newsletters";
import type { EmailSignup } from "@/types/content";
import { RecipientsSelect } from "./recipients-select";
import { newsletterFormSchema, SUBJECT_MAX, type NewsletterFormValues } from "./schema";
import { SendDialog, type SendRequest } from "./send-dialog";

type NewsletterFormProps = {
  /** Id of the draft being edited; undefined when creating. */
  newsletterId?: string;
  defaultValues: NewsletterFormValues;
  onCancel: () => void;
  onDone: () => void;
};

/** Compose form (CAP-6, CAP-7): subject, plain-text body, recipients; Salva and Invia. */
export function NewsletterForm({ newsletterId, defaultValues, onCancel, onDone }: NewsletterFormProps) {
  const invalidate = useInvalidate();
  // Once saved, later saves/sends target the same row (never create a duplicate draft).
  const savedId = useRef<string | undefined>(newsletterId);
  const [sendRequest, setSendRequest] = useState<SendRequest | null>(null);

  const { result: subscribersResult, query: subscribersQuery } = useList<EmailSignup>({
    resource: "email_signups",
    pagination: { mode: "off" },
    sorters: [{ field: "email", order: "asc" }],
    meta: { select: "id, email, created_at" },
  });
  const subscribers = subscribersResult.data;

  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { control, register, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;
  const subject = useWatch({ control, name: "subject" });

  // Only ids still present among subscribers: a deleted subscriber is never addressed.
  const existingIds = (ids: string[]) => {
    const existing = new Set(subscribers.map((s) => s.id));
    return ids.filter((sid) => existing.has(sid));
  };

  const persist = async (values: NewsletterFormValues) => {
    const id = await saveNewsletter({
      id: savedId.current,
      subject: values.subject,
      body: values.body,
      signup_ids: existingIds(values.signup_ids),
    });
    savedId.current = id;
    await invalidate({ resource: "newsletters", invalidates: ["all"] });
    return id;
  };

  const save = handleSubmit(async (values) => {
    try {
      await persist(values);
      toast.success("Bozza salvata");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
    }
  });

  const send = handleSubmit((values) => {
    setSendRequest({
      mode: "send",
      subject: values.subject,
      count: existingIds(values.signup_ids).length,
      prepare: () => persist(values),
      onSent: onDone,
    });
  });

  const busy = isSubmitting || !!sendRequest;

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Messaggio</CardTitle>
          <CardDescription>Testo semplice: viene inviato così come lo scrivi.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.subject}>
              <FieldLabel htmlFor="subject">Oggetto *</FieldLabel>
              <Input
                id="subject"
                maxLength={SUBJECT_MAX}
                aria-invalid={!!errors.subject}
                {...register("subject")}
              />
              <FieldDescription className="tabular-nums">
                {subject?.length ?? 0}/{SUBJECT_MAX}
              </FieldDescription>
              <FieldError errors={[errors.subject]} />
            </Field>
            <Field data-invalid={!!errors.body}>
              <FieldLabel htmlFor="body">Testo *</FieldLabel>
              <Textarea id="body" rows={12} aria-invalid={!!errors.body} {...register("body")} />
              <FieldError errors={[errors.body]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destinatari</CardTitle>
          <CardDescription>
            Solo gli iscritti selezionati ricevono la mail, ognuno con un messaggio separato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!errors.signup_ids}>
            <FieldLabel htmlFor="recipients">Iscritti *</FieldLabel>
            <Controller
              control={control}
              name="signup_ids"
              render={({ field }) => (
                <RecipientsSelect
                  id="recipients"
                  subscribers={subscribers}
                  loading={subscribersQuery.isLoading}
                  value={field.value}
                  onChange={(ids) => {
                    field.onChange(ids);
                    field.onBlur();
                  }}
                  invalid={!!errors.signup_ids}
                />
              )}
            />
            <FieldError errors={[errors.signup_ids]} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Annulla
        </Button>
        <Button type="submit" variant="outline" disabled={busy}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Salva
        </Button>
        <Button type="button" onClick={() => void send()} disabled={busy}>
          <SendIcon />
          Invia
        </Button>
      </div>

      <SendDialog request={sendRequest} onClose={() => setSendRequest(null)} />
    </form>
  );
}
