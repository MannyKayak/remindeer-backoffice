import { useEffect, useState } from "react";
import { getImageUrls } from "@/providers/custom/images";

/** Resolves signed URLs for private storage paths; re-fetches when the set of paths changes. */
export function useImageUrls(storagePaths: string[]) {
  const key = [...storagePaths].sort().join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const paths = key ? key.split("|") : [];
    getImageUrls(paths)
      .then((result) => {
        if (!cancelled) setUrls(result);
      })
      .catch(() => {
        if (!cancelled) setUrls({});
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}
