import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { categoryFormSchema, errorMessage, hasPgCode, type CategoryFormValues } from "./schema";

type CategoryFormProps = {
  defaultValues: CategoryFormValues;
  submitLabel: string;
  /** Throws on failure; a duplicate name is shown under the field, anything else as a toast. */
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
};

export function CategoryForm({ defaultValues, submitLabel, onSubmit, onCancel }: CategoryFormProps) {
  const { register, handleSubmit, setError, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (hasPgCode(error, "23505")) {
        setError("name", { message: "Esiste già una categoria con questo nome" });
      } else {
        toast.error(errorMessage(error, "Salvataggio non riuscito"));
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Categoria</CardTitle>
          <CardDescription>Il nome compare nella scelta della categoria delle domande.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Nome *</FieldLabel>
              <Input
                id="name"
                placeholder="Farmacologia"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
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
    </form>
  );
}
