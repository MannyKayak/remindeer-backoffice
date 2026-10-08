import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useList } from "@refinedev/core";
import { Loader2Icon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/image-picker";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/content";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  questionFormSchema,
  type QuestionFormValues,
} from "./schema";

type QuestionFormProps = {
  defaultValues: QuestionFormValues;
  /** Correct option as stored; when set, changing it asks for explicit confirmation. */
  originalCorrect?: { id?: string; text: string };
  submitLabel: string;
  onSubmit: (values: QuestionFormValues) => Promise<void>;
  onCancel: () => void;
};

export function QuestionForm({
  defaultValues,
  originalCorrect,
  submitLabel,
  onSubmit,
  onCancel,
}: QuestionFormProps) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { control, register, handleSubmit, setValue, getValues, formState } = form;
  const { errors, isSubmitting } = formState;

  const options = useFieldArray({ control, name: "options" });
  const hasMnemonic = useWatch({ control, name: "has_mnemonic" });
  const [pendingValues, setPendingValues] = useState<QuestionFormValues | null>(null);

  const { result: categories } = useList<Category>({
    resource: "categories",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const submit = handleSubmit(async (values) => {
    if (originalCorrect) {
      const next = values.options[values.correct_index];
      const changed = next.id !== originalCorrect.id || next.text.trim() !== originalCorrect.text;
      if (changed) {
        setPendingValues(values);
        return;
      }
    }
    await onSubmit(values);
  });

  const removeOption = (index: number) => {
    const correct = getValues("correct_index");
    options.remove(index);
    if (correct === index) setValue("correct_index", -1);
    else if (correct > index) setValue("correct_index", correct - 1);
  };

  const nextCorrectText = pendingValues
    ? pendingValues.options[pendingValues.correct_index]?.text
    : "";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Domanda</CardTitle>
          <CardDescription>Numero ufficiale, testo e categoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
              <Field data-invalid={!!errors.official_number}>
                <FieldLabel htmlFor="official_number">Numero domanda *</FieldLabel>
                <Input
                  id="official_number"
                  inputMode="numeric"
                  placeholder="3000"
                  aria-invalid={!!errors.official_number}
                  {...register("official_number")}
                />
                <FieldError errors={[errors.official_number]} />
              </Field>

              <Field data-invalid={!!errors.category_id}>
                <FieldLabel htmlFor="category_id">Categoria *</FieldLabel>
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="category_id"
                        className="w-full"
                        aria-invalid={!!errors.category_id}
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Seleziona una categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.data.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.category_id]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.text}>
              <FieldLabel htmlFor="text">Testo domanda *</FieldLabel>
              <Textarea
                id="text"
                rows={3}
                placeholder="Quale tra i metodi indicati può essere impiegato per…"
                aria-invalid={!!errors.text}
                {...register("text")}
              />
              <CharCount control={control} name="text" max={500} />
              <FieldError errors={[errors.text]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="image_id">Immagine domanda</FieldLabel>
              <Controller
                control={control}
                name="image_id"
                render={({ field }) => (
                  <ImagePicker id="image_id" value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldDescription>Opzionale. PNG, JPEG o WebP, massimo 5 MB.</FieldDescription>
            </Field>

            <Controller
              control={control}
              name="is_free"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="is_free">Domanda gratuita</FieldLabel>
                    <FieldDescription>
                      Se attivo, la domanda è visibile anche agli utenti senza abbonamento.
                    </FieldDescription>
                  </FieldContent>
                  <Switch id="is_free" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risposte</CardTitle>
          <CardDescription>
            Da {MIN_OPTIONS} a {MAX_OPTIONS} risposte. Seleziona quella corretta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Controller
            control={control}
            name="correct_index"
            render={({ field }) => (
              <RadioGroup
                value={field.value >= 0 ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                className="gap-2"
              >
                {options.fields.map((option, index) => {
                  const error = errors.options?.[index]?.text;
                  const isCorrect = field.value === index;
                  return (
                    <div key={option.id} className="flex flex-col gap-1">
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                          isCorrect && "border-emerald-600/40 bg-emerald-600/5",
                        )}
                      >
                        <RadioGroupItem
                          value={String(index)}
                          id={`correct-${index}`}
                          aria-label={`Risposta ${index + 1} corretta`}
                        />
                        <Input
                          placeholder={`Risposta ${index + 1}`}
                          aria-invalid={!!error}
                          className="flex-1"
                          {...register(`options.${index}.text`)}
                        />
                        {isCorrect ? (
                          <span className="hidden text-xs font-medium text-emerald-700 sm:inline dark:text-emerald-400">
                            Corretta
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Rimuovi risposta ${index + 1}`}
                          disabled={options.fields.length <= MIN_OPTIONS}
                          onClick={() => removeOption(index)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                      <FieldError errors={[error]} className="pl-9" />
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          />
          <FieldError
            errors={[
              errors.correct_index,
              errors.options?.root,
              errors.options?.message ? { message: errors.options.message } : undefined,
            ]}
          />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={options.fields.length >= MAX_OPTIONS}
              onClick={() => options.append({ text: "" })}
            >
              <PlusIcon />
              Aggiungi risposta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mnemotecnica</CardTitle>
          <CardDescription>Un testo, un'immagine, o entrambi.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={control}
              name="has_mnemonic"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="has_mnemonic">Aggiungi mnemotecnica</FieldLabel>
                  </FieldContent>
                  <Switch
                    id="has_mnemonic"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />

            {hasMnemonic ? (
              <>
                <Field data-invalid={!!errors.mnemonic_text}>
                  <FieldLabel htmlFor="mnemonic_text">Testo mnemotecnica</FieldLabel>
                  <Textarea
                    id="mnemonic_text"
                    rows={2}
                    placeholder="Un cervo (coacervazione) che prepara microcapsule"
                    aria-invalid={!!errors.mnemonic_text}
                    {...register("mnemonic_text")}
                  />
                  <CharCount control={control} name="mnemonic_text" max={255} />
                  <FieldError errors={[errors.mnemonic_text]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="mnemonic_image_id">Immagine mnemotecnica</FieldLabel>
                  <Controller
                    control={control}
                    name="mnemonic_image_id"
                    render={({ field }) => (
                      <ImagePicker
                        id="mnemonic_image_id"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={!!errors.mnemonic_text}
                      />
                    )}
                  />
                </Field>
              </>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>

      <AlertDialog open={!!pendingValues} onOpenChange={(open) => !open && setPendingValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="size-5 text-amber-600" />
              Cambiare la risposta corretta?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La risposta corretta passa da <strong>“{originalCorrect?.text}”</strong> a{" "}
              <strong>“{nextCorrectText}”</strong>. Una risposta corretta sbagliata viene
              memorizzata dagli studenti: verifica sulla fonte ufficiale prima di confermare. La
              modifica resta nel registro modifiche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const values = pendingValues;
                setPendingValues(null);
                if (values) await onSubmit(values);
              }}
            >
              Conferma e salva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function CharCount({
  control,
  name,
  max,
}: {
  control: Control<QuestionFormValues>;
  name: "text" | "mnemonic_text";
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
