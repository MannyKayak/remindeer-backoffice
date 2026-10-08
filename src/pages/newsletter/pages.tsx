import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { useGo, useOne } from "@refinedev/core";
import { RotateCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Newsletter, NewsletterRecipient } from "@/types/content";
import { PageHeader } from "@/pages/questions/page-header";
import { NewsletterForm } from "./newsletter-form";
import { StatusBadge } from "./newsletter-list";
import { emptyNewsletterForm, formatDateTime, newsletterToForm, sendSummary } from "./schema";
import { SendDialog, type SendRequest } from "./send-dialog";

const POSTA = "/newsletter/posta";

export function NewsletterCreatePage() {
  const go = useGo();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Nuova mail newsletter" backTo={POSTA} />
      <NewsletterForm
        defaultValues={emptyNewsletterForm}
        onCancel={() => go({ to: POSTA })}
        onDone={() => go({ to: POSTA })}
      />
    </div>
  );
}

export function NewsletterEditPage() {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { result: newsletter, query } = useOne<Newsletter>({
    resource: "newsletters",
    id: id ?? "",
    meta: { select: "id, subject, body, status, sent_at, created_at, updated_at, newsletter_recipients(signup_id, delivery_status)" },
    queryOptions: { enabled: !!id },
  });

  // Only drafts are editable: anything else goes to the read-only detail.
  if (newsletter && newsletter.status !== "draft") {
    return <Navigate to={`${POSTA}/show/${newsletter.id}`} replace />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Modifica bozza" backTo={POSTA} />
      {query.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : query.isError || !newsletter ? (
        <p className="text-sm text-destructive">Newsletter non trovata.</p>
      ) : (
        <NewsletterForm
          key={newsletter.updated_at}
          newsletterId={newsletter.id}
          defaultValues={newsletterToForm(newsletter)}
          onCancel={() => go({ to: POSTA })}
          onDone={() => go({ to: POSTA })}
        />
      )}
    </div>
  );
}

const DELIVERY_LABEL: Record<NewsletterRecipient["delivery_status"], string> = {
  pending: "In attesa",
  sent: "Inviata",
  failed: "Non riuscita",
};

/** Read-only detail of a sent newsletter with per-recipient delivery outcome. */
export function NewsletterShowPage() {
  const { id } = useParams<{ id: string }>();
  const [sendRequest, setSendRequest] = useState<SendRequest | null>(null);
  const { result: newsletter, query } = useOne<Newsletter & { newsletter_recipients?: NewsletterRecipient[] }>({
    resource: "newsletters",
    id: id ?? "",
    meta: {
      select:
        "id, subject, body, status, sent_at, created_at, updated_at, newsletter_recipients(id, signup_id, email, delivery_status, delivered_at, error)",
    },
    queryOptions: { enabled: !!id },
  });

  if (newsletter && newsletter.status === "draft") {
    return <Navigate to={`${POSTA}/edit/${newsletter.id}`} replace />;
  }

  const summary = newsletter ? sendSummary(newsletter) : null;
  const recipients = [...(newsletter?.newsletter_recipients ?? [])].sort((a, b) =>
    a.email.localeCompare(b.email),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={newsletter?.subject ?? "Newsletter"}
        description={newsletter ? `Inviata il ${formatDateTime(newsletter.sent_at)}` : undefined}
        backTo={POSTA}
        actions={
          newsletter?.status === "sent" && summary && summary.failed > 0 ? (
            <Button
              variant="outline"
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
              Ritenta i non riusciti
            </Button>
          ) : null
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : query.isError || !newsletter || !summary ? (
        <p className="text-sm text-destructive">Newsletter non trovata.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Messaggio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{newsletter.body}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Destinatari <StatusBadge summary={summary} />
              </CardTitle>
              <CardDescription>
                {summary.sent} inviate, {summary.failed} non riuscite su {summary.total}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Email</TableHead>
                      <TableHead className="w-32">Esito</TableHead>
                      <TableHead className="hidden w-40 sm:table-cell">Consegnata il</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="max-w-0 w-full">
                          <span className="block truncate" title={recipient.email}>
                            {recipient.email}
                          </span>
                          {recipient.error ? (
                            <span className="block truncate text-xs text-destructive" title={recipient.error}>
                              {recipient.error}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              recipient.delivery_status === "failed"
                                ? "destructive"
                                : recipient.delivery_status === "sent"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {DELIVERY_LABEL[recipient.delivery_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                          {formatDateTime(recipient.delivered_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <SendDialog request={sendRequest} onClose={() => setSendRequest(null)} />
    </div>
  );
}
