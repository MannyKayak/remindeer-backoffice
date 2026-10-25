import { useState } from "react";
import { Link } from "react-router";
import { useDelete, useList } from "@refinedev/core";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import type { Category } from "@/types/content";
import { PageHeader } from "@/pages/questions/page-header";
import { errorMessage, hasPgCode, usageLabel } from "./schema";

type CategoryRow = Category & { questions?: { count: number }[] };

const LIST_SELECT = "id, name, questions(count)";

const questionCount = (category: CategoryRow) => category.questions?.[0]?.count ?? 0;

export function CategoryListPage() {
  const { result, query } = useList<CategoryRow>({
    resource: "categories",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: LIST_SELECT },
  });
  const { mutate: deleteCategory, mutation: deleteMutation } = useDelete();
  // Target kept after closing so the dialog content does not change during its close animation.
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const categories = result.data;
  const usedBy = toDelete ? questionCount(toDelete) : 0;

  const confirmDelete = () => {
    if (!toDelete) return;
    const target = toDelete;
    deleteCategory(
      { resource: "categories", id: target.id, errorNotification: false, successNotification: false },
      {
        onSuccess: () => {
          toast.success(`Categoria “${target.name}” eliminata`);
          setDialogOpen(false);
        },
        onError: (error) => {
          // A question may have been assigned after the list loaded; the FK refuses the delete.
          toast.error(
            hasPgCode(error, "23503")
              ? `“${target.name}” è usata da almeno una domanda: riassegnale prima di eliminarla.`
              : errorMessage(error, "Eliminazione non riuscita"),
          );
          setDialogOpen(false);
          query.refetch();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorie"
        description={
          query.isSuccess
            ? categories.length === 1
              ? "1 categoria"
              : `${categories.length} categorie`
            : undefined
        }
        actions={
          <Button asChild>
            <Link to="/categories/create">
              <PlusIcon />
              Nuova categoria
            </Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead className="w-28 text-right">Domande</TableHead>
              <TableHead className="w-24 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : query.isError ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-destructive">
                  Impossibile caricare le categorie: {query.error?.message}
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-16 text-center">
                  <p className="font-medium">Nessuna categoria</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aggiungi la prima categoria con “Nuova categoria”.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="max-w-0 w-full">
                    <span className="block truncate" title={category.name}>
                      {category.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{questionCount(category)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link
                          to={`/categories/edit/${category.id}`}
                          aria-label={`Modifica categoria ${category.name}`}
                        >
                          <PencilIcon />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Elimina categoria ${category.name}`}
                        onClick={() => {
                          setToDelete(category);
                          setDialogOpen(true);
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setDialogOpen(false)}
      >
        <AlertDialogContent>
          {usedBy > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Impossibile eliminare “{toDelete?.name}”</AlertDialogTitle>
                <AlertDialogDescription>
                  La categoria è usata da {usageLabel(usedBy)}. Assegna a quelle domande un'altra
                  categoria, poi potrai eliminarla.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Chiudi</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare la categoria “{toDelete?.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Nessuna domanda la usa. L'operazione resta nel registro modifiche.
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
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
