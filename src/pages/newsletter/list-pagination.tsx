import type { Dispatch, SetStateAction } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ListPagination({
  currentPage,
  pageCount,
  setCurrentPage,
}: {
  currentPage: number;
  pageCount: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}) {
  if (pageCount <= 1) return null;
  return (
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
  );
}
