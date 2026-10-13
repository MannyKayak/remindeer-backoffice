import { useList, useUpdate } from "@refinedev/core";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import type { PageContent } from "@/types/content";
import { PageHeader } from "@/pages/questions/page-header";
import { HomeForm } from "./home-form";
import { HOME_SLUG, homeContentToForm, homeFormToContent } from "./schema";

/** "Contenuti pagine → Home": edits the landing home page content. */
export function HomePageContentPage() {
  const { result, query } = useList<PageContent>({
    resource: "page_contents",
    filters: [{ field: "slug", operator: "eq", value: HOME_SLUG }],
    pagination: { mode: "off" },
  });
  const { mutateAsync: update } = useUpdate();
  const page = result.data[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Home" description="Contenuti della pagina iniziale del sito." />
      {query.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          Impossibile caricare i contenuti: {query.error?.message}
        </p>
      ) : !page ? (
        <p className="text-sm text-destructive">Contenuti della home non trovati.</p>
      ) : (
        <HomeForm
          key={page.updated_at}
          defaultValues={homeContentToForm(page.content)}
          onSubmit={async (values) => {
            try {
              await update({
                resource: "page_contents",
                id: page.id,
                values: { content: homeFormToContent(values) },
                successNotification: false,
                errorNotification: false,
              });
              toast.success("Home aggiornata");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
            }
          }}
        />
      )}
    </div>
  );
}
