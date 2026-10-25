import { useGo, useInvalidate, useOne, useUpdate } from "@refinedev/core";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/types/content";
import { PageHeader } from "@/pages/questions/page-header";
import { CategoryForm } from "./category-form";
import { categoryToForm } from "./schema";

export function CategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const invalidate = useInvalidate();
  const { mutateAsync: update } = useUpdate();

  const { result: category, query } = useOne<Category>({
    resource: "categories",
    id: id ?? "",
    queryOptions: { enabled: !!id },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={category ? `Modifica “${category.name}”` : "Modifica categoria"}
        backTo="/categories"
      />
      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError || !category ? (
        <p className="text-sm text-destructive">Categoria non trovata.</p>
      ) : (
        <CategoryForm
          defaultValues={categoryToForm(category)}
          submitLabel="Salva modifiche"
          onCancel={() => go({ to: "/categories" })}
          onSubmit={async (values) => {
            await update({
              resource: "categories",
              id: category.id,
              values,
              successNotification: false,
              errorNotification: false,
            });
            // Question rows embed the category name; the rename is saved, so do not wait on refetches.
            void invalidate({ resource: "questions", invalidates: ["list", "detail"] });
            toast.success(`Categoria “${values.name}” aggiornata`);
            go({ to: "/categories" });
          }}
        />
      )}
    </div>
  );
}
