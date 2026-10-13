import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageImagePicker } from "@/components/page-image-picker";
import { cn } from "@/lib/utils";
import {
  CTA_LABEL_MAX,
  CTA_NOTE_MAX,
  IMAGE_ALT_MAX,
  MAX_STATS,
  SUBTITLE_MAX,
  TITLE_MAX,
  homeFormSchema,
  type HomeFormValues,
} from "./schema";

type HomeFormProps = {
  defaultValues: HomeFormValues;
  onSubmit: (values: HomeFormValues) => Promise<void>;
};

export function HomeForm({ defaultValues, onSubmit }: HomeFormProps) {
  const { control, register, handleSubmit, reset, formState } = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { errors, isSubmitting, isDirty } = formState;

  const stats = useFieldArray({ control, name: "stats" });
  const heroImagePath = useWatch({ control, name: "hero_image_path" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Testi</CardTitle>
          <CardDescription>Titolo e sottotitolo in apertura della pagina.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Titolo *</FieldLabel>
              <Textarea id="title" rows={2} aria-invalid={!!errors.title} {...register("title")} />
              <CharCount control={control} name="title" max={TITLE_MAX} />
              <FieldError errors={[errors.title]} />
            </Field>

            <Field data-invalid={!!errors.subtitle}>
              <FieldLabel htmlFor="subtitle">Sottotitolo *</FieldLabel>
              <Textarea
                id="subtitle"
                rows={3}
                aria-invalid={!!errors.subtitle}
                {...register("subtitle")}
              />
              <CharCount control={control} name="subtitle" max={SUBTITLE_MAX} />
              <FieldError errors={[errors.subtitle]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hero image</CardTitle>
          <CardDescription>L'immagine accanto al titolo.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="hero_image_path">Immagine</FieldLabel>
              <Controller
                control={control}
                name="hero_image_path"
                render={({ field }) => (
                  <PageImagePicker
                    id="hero_image_path"
                    value={field.value}
                    onChange={field.onChange}
                    emptyLabel="Immagine predefinita del sito"
                  />
                )}
              />
              <FieldDescription>
                PNG, JPEG o WebP, massimo 5 MB. Senza immagine il sito mostra quella predefinita.
              </FieldDescription>
            </Field>

            {heroImagePath ? (
              <Field data-invalid={!!errors.hero_image_alt}>
                <FieldLabel htmlFor="hero_image_alt">Descrizione immagine *</FieldLabel>
                <Textarea
                  id="hero_image_alt"
                  rows={2}
                  placeholder="Il cervo Remindeer in camice da laboratorio…"
                  aria-invalid={!!errors.hero_image_alt}
                  {...register("hero_image_alt")}
                />
                <CharCount control={control} name="hero_image_alt" max={IMAGE_ALT_MAX} />
                <FieldDescription>
                  Letta dagli screen reader e dai motori di ricerca al posto dell'immagine.
                </FieldDescription>
                <FieldError errors={[errors.hero_image_alt]} />
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA</CardTitle>
          <CardDescription>Il pulsante che porta al quiz gratuito.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.cta_label}>
              <FieldLabel htmlFor="cta_label">Testo del pulsante *</FieldLabel>
              <Input
                id="cta_label"
                maxLength={CTA_LABEL_MAX}
                aria-invalid={!!errors.cta_label}
                {...register("cta_label")}
              />
              <FieldError errors={[errors.cta_label]} />
            </Field>

            <Field data-invalid={!!errors.cta_note}>
              <FieldLabel htmlFor="cta_note">Nota sotto il pulsante</FieldLabel>
              <Input
                id="cta_note"
                maxLength={CTA_NOTE_MAX}
                aria-invalid={!!errors.cta_note}
                {...register("cta_note")}
              />
              <FieldDescription>Opzionale.</FieldDescription>
              <FieldError errors={[errors.cta_note]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiche</CardTitle>
          <CardDescription>
            Fino a {MAX_STATS} numeri in evidenza sotto il pulsante, nell'ordine indicato.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {stats.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna statistica: la riga non viene mostrata sul sito.
            </p>
          ) : null}
          {stats.fields.map((stat, index) => {
            const error = errors.stats?.[index];
            return (
              <div key={stat.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Input
                    placeholder="3000"
                    aria-label={`Valore statistica ${index + 1}`}
                    aria-invalid={!!error?.value}
                    className="w-28"
                    {...register(`stats.${index}.value`)}
                  />
                  <Input
                    placeholder="domande ufficiali"
                    aria-label={`Etichetta statistica ${index + 1}`}
                    aria-invalid={!!error?.label}
                    className="flex-1"
                    {...register(`stats.${index}.label`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rimuovi statistica ${index + 1}`}
                    onClick={() => stats.remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <FieldError errors={[error?.value, error?.label]} />
              </div>
            );
          })}
          <FieldError errors={[errors.stats?.root]} />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stats.fields.length >= MAX_STATS}
              onClick={() => stats.append({ value: "", label: "" })}
            >
              <PlusIcon />
              Aggiungi statistica
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isSubmitting || !isDirty}
        >
          Annulla modifiche
        </Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          Salva modifiche
        </Button>
      </div>
    </form>
  );
}

function CharCount({
  control,
  name,
  max,
}: {
  control: Control<HomeFormValues>;
  name: "title" | "subtitle" | "hero_image_alt";
  max: number;
}) {
  const value = useWatch({ control, name }) ?? "";
  return (
    <p
      className={cn(
        "-mt-1 text-right text-xs text-muted-foreground tabular-nums",
        value.length > max && "text-destructive",
      )}
    >
      {value.length}/{max}
    </p>
  );
}
