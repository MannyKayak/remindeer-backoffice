import { useRef, useState } from "react";
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES } from "@/providers/custom/images";
import { pageImageUrl, uploadPageImage } from "@/providers/custom/page-images";
import { cn } from "@/lib/utils";

type PageImagePickerProps = {
  id?: string;
  /** Object path in the public page-images bucket. */
  value: string | null;
  onChange: (path: string | null) => void;
  emptyLabel?: string;
  invalid?: boolean;
};

export function PageImagePicker({ id, value, onChange, emptyLabel, invalid }: PageImagePickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadPageImage(file));
      toast.success("Immagine caricata");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Caricamento non riuscito");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div
      id={id}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center",
        invalid && "border-destructive",
      )}
    >
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {value ? (
          <img src={pageImageUrl(value)} alt="" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate text-sm text-muted-foreground">
          {value ? "Immagine personalizzata" : (emptyLabel ?? "Nessuna immagine")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {value ? "Sostituisci" : "Carica"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <XIcon />
              Rimuovi
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
