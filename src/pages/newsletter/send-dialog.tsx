import { useState } from "react";
import { useInvalidate } from "@refinedev/core";
import { Loader2Icon, SendIcon } from "lucide-react";
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
import {
  retryNewsletter,
  sendNewsletter,
  type SendNewsletterResult,
} from "@/providers/custom/newsletters";

export type SendRequest = {
  mode: "send" | "retry";
  subject: string;
  /** Recipients that will be contacted: all for send, failed ones for retry. */
  count: number;
  /** Returns the id of the newsletter to send (the form saves the draft first). */
  prepare: () => Promise<string>;
  onSent?: () => void;
};

/** Confirmation + execution of a newsletter send or retry (CAP-9, CAP-11). */
export function SendDialog({ request, onClose }: { request: SendRequest | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [pending, setPending] = useState(false);
  const isRetry = request?.mode === "retry";

  const run = async () => {
    if (!request) return;
    setPending(true);
    try {
      const id = await request.prepare();
      const result: SendNewsletterResult = isRetry ? await retryNewsletter(id) : await sendNewsletter(id);
      if (result.failed > 0) {
        toast.warning(
          `Inviata a ${result.sent} destinatari, ${result.failed} non riusciti. Puoi ritentare dalla lista Posta.`,
        );
      } else {
        toast.success(`Inviata a ${result.sent} destinatari`);
      }
      request.onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio non riuscito");
    } finally {
      await invalidate({ resource: "newsletters", invalidates: ["all"] });
      setPending(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRetry ? "Ritentare l'invio?" : "Inviare la newsletter?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            «{request?.subject}» verrà inviata a{" "}
            <strong>
              {request?.count} {request?.count === 1 ? "destinatario" : "destinatari"}
            </strong>
            {isRetry ? " per cui l'invio precedente non è riuscito" : ""}, ognuno con una mail
            separata. L'invio non si può annullare e la newsletter non sarà più modificabile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              void run();
            }}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            {isRetry ? "Ritenta" : "Invia"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
