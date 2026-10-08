import { useGo, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";

import { PageHeader } from "./page-header";
import { QuestionForm } from "./question-form";
import { emptyQuestionForm } from "./schema";
import { saveQuestionForm } from "./save";

export function QuestionCreatePage() {
  const go = useGo();
  const invalidate = useInvalidate();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Nuova domanda" backTo="/questions" />
      <QuestionForm
        defaultValues={emptyQuestionForm}
        submitLabel="Crea domanda"
        onCancel={() => go({ to: "/questions" })}
        onSubmit={async (values) => {
          try {
            await saveQuestionForm(values);
            await invalidate({ resource: "questions", invalidates: ["list"] });
            toast.success(`Domanda ${values.official_number} creata`);
            go({ to: "/questions" });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
          }
        }}
      />
    </div>
  );
}
