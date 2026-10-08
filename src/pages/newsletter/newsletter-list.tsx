import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useDelete, useTable } from "@refinedev/core";
import { EyeIcon, Loader2Icon, PencilIcon, RotateCwIcon, SendIcon, Trash2Icon } from "lucide-react";
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
import type { Newsletter } from "@/types/content";
import { ListPagination } from "./list-pagination";
import { formatDateTime, sendSummary } from "./schema";
import { SendDialog, type SendRequest } from "./send-dialog";

const PAGE_SIZE = 20;
const LIST_SELECT =
  "id, subject, status, sent_at, created_at, updated_at, newsletter_recipients(signup_id, delivery_status)";

/** Tab "Posta": newsletters with send status; send, retry, edit and delete drafts. */
export function NewsletterListPage() {
  const { tableQuery, result, currentPage, setCurrentPage, pageCount } = useTable<Newsletter>({
    resource: "newsletters",
    pagination: { pageSize: PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    meta: { select: LIST_SELECT },
  });
  const { mutate: deleteNewsletter, mutation: deleteMutation } = useDelete();
  const [toDelete, setToDelete] = useState<Newsletter | null>(null);
  const [sendRequest, setSendRequest] = useState<SendRequest | null>(null);

  const newsletters = result.data;

  const confirmDelete = () => {
    if (!toDelete) return;
    const target = toDelete;
    deleteNewsletter(
      { resource: "newsletters", id: target.id, successNotification: false },
      {
        onSuccess: () => {
          toast.success(`«${target.subject}» eliminata`);
          setToDelete(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Oggetto</TableHead>
              <TableHead className="w-28 text-right">Destinatari</TableHead>
              <TableHead className="w-48">Stato</TableHead>
              <TableHead className="hidden w-40 md:table-cell">Inviata il</TableHead>
              <TableHead className="w-32 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tableQuery.isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-destructive">
                  Impossibile caricare le newsletter: {tableQuery.error?.message}
                </TableCell>
              </TableRow>
            ) : newsletters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="font-medium">Nessuna newsletter</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scrivi la prima con “Crea una mail newsletter”.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              newsletters.map((newsletter) => {
                const summary = sendSummary(newsletter);
                const isDraft = newsletter.status === "draft";
                return (
                  <TableRow key={newsletter.id}>
                    <TableCell className="max-w-0 w-full">
                      <span className="block truncate" title={newsletter.subject}>
                        {newsletter.subject}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.total}</TableCell>
                    <TableCell>
                      <StatusBadge summary={summary} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums md:table-cell">
                      {formatDateTime(newsletter.sent_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isDraft ? (
                          <>
                            <IconAction
                              label={`Invia «${newsletter.subject}»`}
                              tooltip="Invia"
                              disabled={summary.total === 0}
                              onClick={() =>
                                setSendRequest({
                                  mode: "send",
                                  subject: newsletter.subject,
                                  count: summary.total,
                                  prepare: async () => newsletter.id,
                                })
                              }
                            >
                              <SendIcon />
                            </IconAction>
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link
                                to={`/newsletter/posta/edit/${newsletter.id}`}
                                aria-label={`Modifica «${newsletter.subject}»`}
                              >
                                <PencilIcon />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Elimina «${newsletter.subject}»`}
                              onClick={() => setToDelete(newsletter)}
                            >
                              <Trash2Icon />
                            </Button>
                          </>
                        ) : (
                          <>
                            {newsletter.status === "sent" && summary.failed > 0 ? (
                              <IconAction
                                label={`Ritenta invio di «${newsletter.subject}»`}
                                tooltip="Ritenta i non riusciti"
                                onClick={() =>
                                  setSendRequest({
                                    mode: "retry",
                                    subject: newsletter.subject,
                                    count: summary.failed,
                                    prepare: async () => newsletter.id,
                                  })
                                }
                              >
                                <RotateCwIcon />
                              </IconAction>
                            ) : null}
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link
                                to={`/newsletter/posta/show/${newsletter.id}`}
                                aria-label={`Dettaglio invio di «${newsletter.subject}»`}
                              >
                                <EyeIcon />
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination currentPage={currentPage} pageCount={pageCount} setCurrentPage={setCurrentPage} />

      <SendDialog request={sendRequest} onClose={() => setSendRequest(null)} />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la bozza «{toDelete?.subject}»?</AlertDialogTitle>
            <AlertDialogDescription>
              La bozza e la sua selezione di destinatari vengono eliminate. L'operazione resta nel
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

export function StatusBadge({ summary }: { summary: ReturnType<typeof sendSummary> }) {
  switch (summary.label) {
    case "Bozza":
      return <Badge variant="outline">Bozza</Badge>;
    case "In invio":
      return (
        <Badge variant="secondary">
          <Loader2Icon className="animate-spin" />
          In invio
        </Badge>
      );
    case "Inviata":
      return (
        <Badge className="bg-emerald-600 text-white">
          Inviata · {summary.sent}/{summary.total}
        </Badge>
      );
    case "Inviata con errori":
      return (
        <Badge variant="destructive">
          Con errori · {summary.failed} su {summary.total}
        </Badge>
      );
  }
}

function IconAction({
  label,
  tooltip,
  disabled,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
