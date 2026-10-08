import { useRef, useState } from "react";
import { useInvalidate, useList, useOne } from "@refinedev/core";
import { ImageIcon, ImagesIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImageUrls } from "@/hooks/use-image-urls";
import { ALLOWED_IMAGE_TYPES, uploadImage } from "@/providers/custom/images";
import { cn } from "@/lib/utils";
import type { Image } from "@/types/content";

type ImagePickerProps = {
  id?: string;
  value: string | null;
  onChange: (imageId: string | null) => void;
  invalid?: boolean;
};

export function ImagePicker({ id, value, onChange, invalid }: ImagePickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const invalidate = useInvalidate();

  const { result: selected } = useOne<Image>({
    resource: "images",
    id: value ?? "",
    queryOptions: { enabled: !!value },
  });
  const urls = useImageUrls(selected ? [selected.storage_path] : []);
  const previewUrl = selected ? urls[selected.storage_path] : undefined;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const image = await uploadImage(file);
      await invalidate({ resource: "images", invalidates: ["list"] });
      onChange(image.id);
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
        {value && previewUrl ? (
          <img src={previewUrl} alt={selected?.file_name ?? ""} className="size-full object-cover" />
        ) : value ? (
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate text-sm text-muted-foreground">
          {value ? (selected?.file_name ?? "…") : "Nessuna immagine"}
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
            Carica
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
            <ImagesIcon />
            Scegli esistente
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

      <ImageLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        selectedId={value}
        onSelect={(imageId) => {
          onChange(imageId);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

function ImageLibraryDialog({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string | null;
  onSelect: (imageId: string) => void;
}) {
  const { result, query } = useList<Image>({
    resource: "images",
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: open },
  });
  const images = result.data;
  const urls = useImageUrls(open ? images.map((i) => i.storage_path) : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Immagini caricate</DialogTitle>
          <DialogDescription>Seleziona un'immagine già presente nel database.</DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nessuna immagine caricata finora.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(image.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  image.id === selectedId && "border-primary ring-2 ring-primary/30",
                )}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
                  {urls[image.storage_path] ? (
                    <img
                      src={urls[image.storage_path]}
                      alt={image.file_name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">{image.file_name}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
