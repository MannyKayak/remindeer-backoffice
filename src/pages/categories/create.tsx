import { useCreate, useGo } from "@refinedev/core";
import { toast } from "sonner";

import { PageHeader } from "@/pages/questions/page-header";
import { CategoryForm } from "./category-form";
import { emptyCategoryForm } from "./schema";

export function CategoryCreatePage() {
  const go = useGo();
  const { mutateAsync: create } = useCreate();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Nuova categoria" backTo="/categories" />
      <CategoryForm
        defaultValues={emptyCategoryForm}
        submitLabel="Crea categoria"
        onCancel={() => go({ to: "/categories" })}
        onSubmit={async (values) => {
          await create({
            resource: "categories",
            values,
            successNotification: false,
            errorNotification: false,
          });
          toast.success(`Categoria “${values.name}” creata`);
          go({ to: "/categories" });
        }}
      />
    </div>
  );
}
