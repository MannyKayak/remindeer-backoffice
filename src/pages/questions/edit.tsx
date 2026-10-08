import { useGo, useInvalidate, useOne } from "@refinedev/core";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import type { Question } from "@/types/content";
import { PageHeader } from "./page-header";
import { QuestionForm } from "./question-form";
import { questionToForm } from "./schema";
import { QUESTION_DETAIL_SELECT, saveQuestionForm } from "./save";

export function QuestionEditPage() {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const invalidate = useInvalidate();

  const { result: question, query } = useOne<Question>({
    resource: "questions",
    id: id ?? "",
    meta: { select: QUESTION_DETAIL_SELECT },
    queryOptions: { enabled: !!id },
  });

  const correct = question?.question_options?.find((o) => o.is_correct);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={question ? `Modifica domanda ${question.official_number}` : "Modifica domanda"}
        backTo="/questions"
      />
      {query.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : query.isError || !question ? (
        <p className="text-sm text-destructive">Domanda non trovata.</p>
      ) : (
        <QuestionForm
          key={question.updated_at}
          defaultValues={questionToForm(question)}
          originalCorrect={correct ? { id: correct.id, text: correct.text } : undefined}
          submitLabel="Salva modifiche"
          onCancel={() => go({ to: "/questions" })}
          onSubmit={async (values) => {
            try {
              await saveQuestionForm(values, question.id);
              await invalidate({ resource: "questions", invalidates: ["list", "detail"], id: question.id });
              toast.success(`Domanda ${values.official_number} aggiornata`);
              go({ to: "/questions" });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
            }
          }}
        />
      )}
    </div>
  );
}
