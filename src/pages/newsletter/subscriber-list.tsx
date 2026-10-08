import { useState } from "react";
import { useDelete, useTable, useUpdate } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmailSignup } from "@/types/content";
import { ListPagination } from "./list-pagination";
import {
  EMAIL_MAX,
  formatDateTime,
  subscriberFormSchema,
  type SubscriberFormInput,
  type SubscriberFormValues,
} from "./schema";

const PAGE_SIZE = 20;

/** Tab "Clienti": emails collected by the landing signup form. */
export function SubscriberListPage() {
  const { tableQuery, result, currentPage, setCurrentPage, pageCount } = useTable<EmailSignup>({
    resource: "email_signups",
    pagination: { pageSize: PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    meta: { select: "id, email, created_at" },
  });
  const { mutate: deleteSubscriber, mutation: deleteMutation } = useDelete();
  const [toEdit, setToEdit] = useState<EmailSignup | null>(null);
  const [toDelete, setToDelete] = useState<EmailSignup | null>(null);

  const subscribers = result.data;
  const total = result.total ?? 0;

  const confirmDelete = () => {
    if (!toDelete) return;
    const target = toDelete;
    deleteSubscriber(
      { resource: "email_signups", id: target.id, successNotification: false },
      {
        onSuccess: () => {
          toast.success(`${target.email} eliminata`);
          setToDelete(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {tableQuery.isSuccess ? `${total} iscritti` : " "}
      </p>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Email</TableHead>
              <TableHead className="hidden w-44 sm:table-cell">Iscritto il</TableHead>
              <TableHead className="w-24 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tableQuery.isError ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-destructive">
                  Impossibile caricare gli iscritti: {tableQuery.error?.message}
                </TableCell>
              </TableRow>
            ) : subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-16 text-center">
                  <p className="font-medium">Nessun iscritto</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Le email lasciate nel form “Tienimi aggiornato” della landing compariranno qui.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="max-w-0 w-full">
                    <span className="block truncate" title={subscriber.email}>
                      {subscriber.email}
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                    {formatDateTime(subscriber.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifica ${subscriber.email}`}
                        onClick={() => setToEdit(subscriber)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Elimina ${subscriber.email}`}
                        onClick={() => setToDelete(subscriber)}
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

      <ListPagination currentPage={currentPage} pageCount={pageCount} setCurrentPage={setCurrentPage} />

      <Dialog open={!!toEdit} onOpenChange={(open) => !open && setToEdit(null)}>
        <DialogContent>
          {toEdit ? <EditSubscriberForm key={toEdit.id} subscriber={toEdit} onDone={() => setToEdit(null)} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {toDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              L'indirizzo viene rimosso dagli iscritti e dalle bozze in cui è selezionato. Le
              newsletter già inviate conservano l'indirizzo nello storico. L'operazione resta nel
              registro modifiche.
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

function EditSubscriberForm({ subscriber, onDone }: { subscriber: EmailSignup; onDone: () => void }) {
  const { mutateAsync: update } = useUpdate();
  const { register, handleSubmit, setError, formState } = useForm<
    SubscriberFormInput,
    unknown,
    SubscriberFormValues
  >({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: { email: subscriber.email },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    try {
      await update({
        resource: "email_signups",
        id: subscriber.id,
        values: { email: values.email },
        successNotification: false,
        errorNotification: false,
      });
      toast.success("Email aggiornata");
      onDone();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Salvataggio non riuscito";
      if (/duplicate|unique|23505/i.test(message)) {
        setError("email", { message: "Questa email è già tra gli iscritti" });
      } else {
        toast.error(message);
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Modifica email</DialogTitle>
        <DialogDescription>
          Le bozze usano automaticamente l'indirizzo aggiornato al momento dell'invio.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="subscriber-email">Email *</FieldLabel>
        <Input
          id="subscriber-email"
          type="email"
          autoComplete="off"
          maxLength={EMAIL_MAX}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError errors={[errors.email]} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          Salva
        </Button>
      </DialogFooter>
    </form>
  );
}
