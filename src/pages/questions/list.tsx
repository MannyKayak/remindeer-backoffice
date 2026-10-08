import { useState } from "react";
import { Link } from "react-router";
import { useDelete, useTable } from "@refinedev/core";
import { ChevronLeftIcon, ChevronRightIcon, LightbulbIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { firstMnemonic, type Question } from "@/types/content";
import { PageHeader } from "./page-header";

const PAGE_SIZE = 20;
const LIST_SELECT =
  "id, official_number, text, is_free, categories(name), question_options(text, is_correct), mnemonics(id)";

export function QuestionListPage() {
  const { tableQuery, result, currentPage, setCurrentPage, pageCount } = useTable<Question>({
    resource: "questions",
    pagination: { pageSize: PAGE_SIZE },
    sorters: { initial: [{ field: "official_number", order: "asc" }] },
    meta: { select: LIST_SELECT },
  });
  const { mutate: deleteQuestion, mutation: deleteMutation } = useDelete();
  const [toDelete, setToDelete] = useState<Question | null>(null);

  const questions = result.data;
  const total = result.total ?? 0;

  const confirmDelete = () => {
    if (!toDelete) return;
    const target = toDelete;
    deleteQuestion(
      { resource: "questions", id: target.id },
      {
        onSuccess: () => {
          toast.success(`Domanda ${target.official_number} eliminata`);
          setToDelete(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Domande"
        description={tableQuery.isSuccess ? `${total} domande in archivio` : undefined}
        actions={
          <Button asChild>
            <Link to="/questions/create">
              <PlusIcon />
              Nuova domanda
            </Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-20">N°</TableHead>
              <TableHead>Domanda</TableHead>
              <TableHead className="hidden lg:table-cell">Risposta corretta</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="w-24">Accesso</TableHead>
              <TableHead className="w-24 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tableQuery.isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  Impossibile caricare le domande: {tableQuery.error?.message}
                </TableCell>
              </TableRow>
            ) : questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <p className="font-medium">Nessuna domanda</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aggiungi la prima domanda con “Nuova domanda”.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => {
                const correct = question.question_options?.find((o) => o.is_correct);
                const hasMnemonic = firstMnemonic(question.mnemonics) !== null;
                return (
                  <TableRow key={question.id}>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {question.official_number}
                    </TableCell>
                    <TableCell className="max-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="truncate" title={question.text}>
                          {question.text}
                        </span>
                        {hasMnemonic ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <LightbulbIcon
                                className="size-4 shrink-0 text-amber-500"
                                aria-label="Con mnemotecnica"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Con mnemotecnica</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate text-muted-foreground lg:table-cell">
                      {correct?.text ?? "—"}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      {question.categories?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {question.is_free ? (
                        <Badge variant="secondary">Gratis</Badge>
                      ) : (
                        <Badge variant="outline">Premium</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link
                            to={`/questions/edit/${question.id}`}
                            aria-label={`Modifica domanda ${question.official_number}`}
                          >
                            <PencilIcon />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Elimina domanda ${question.official_number}`}
                          onClick={() => setToDelete(question)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            Pagina {currentPage} di {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Pagina precedente"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Pagina successiva"
            disabled={currentPage >= pageCount}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      ) : null}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la domanda {toDelete?.official_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminate anche le sue risposte e la mnemotecnica. Le immagini restano
              disponibili nella libreria. L'operazione resta nel registro modifiche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
