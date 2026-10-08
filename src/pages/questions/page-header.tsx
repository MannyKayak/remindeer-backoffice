import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  backTo,
  actions,
}: {
  title: string;
  description?: string;
  backTo?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-2">
        {backTo ? (
          <Button asChild variant="ghost" size="icon-sm" className="mt-0.5">
            <Link to={backTo} aria-label="Torna indietro">
              <ArrowLeftIcon />
            </Link>
          </Button>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions}
    </div>
  );
}
