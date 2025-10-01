import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { LuUpload, LuX } from "react-icons/lu";
import { z } from "zod";

type ImageEntryProps = {
  onSave: (file: File) => void;
  children?: React.ReactNode;
  maxSize?: number;
  accept?: Record<string, string[]>;
};

export default function ImageEntry({
  onSave,
  children,
  maxSize = 20 * 1024 * 1024, // 20MB default
  accept = { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
}: ImageEntryProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [preview, setPreview] = useState<string | null>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Auto focus the dropzone
  useEffect(() => {
    if (dropzoneRef.current && !preview) {
      dropzoneRef.current.focus();
    }
  }, [preview]);

  // Clean up preview URL on unmount or preview change
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const formSchema = z.object({
    file: z
      .instanceof(File, { message: t("imageEntry.validation.selectImage") })
      .refine((file) =>
        accept["image/*"].includes(`.${file.type.split("/")[1]}`),
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        form.setValue("file", file, { shouldValidate: true });

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
      }
    },
    [form],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      maxSize,
      accept,
      multiple: false,
    });

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const clipboardItems = Array.from(event.clipboardData.items);
      for (const item of clipboardItems) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob && blob.size <= maxSize) {
            const mimeType = blob.type.split("/")[1];
            const extension = `.${mimeType}`;
            if (accept["image/*"].includes(extension)) {
              const fileName = blob.name || `pasted-image.${mimeType}`;
              const file = new File([blob], fileName, { type: blob.type });
              form.setValue("file", file, { shouldValidate: true });
              const objectUrl = URL.createObjectURL(file);
              setPreview(objectUrl);
              return; // Take the first valid image
            }
          }
        }
      }
    },
    [form, maxSize, accept],
  );

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      if (!data.file) return;
      onSave(data.file);
    },
    [onSave],
  );

  const clearSelection = () => {
    form.reset();
    setPreview(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormControl>
                <div
                  className="w-full"
                  onPaste={handlePaste}
                  tabIndex={0}
                  ref={dropzoneRef}
                >
                  {!preview ? (
                    <div
                      {...getRootProps()}
                      className={cn(
                        "flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                        isDragActive && "border-primary bg-primary/5",
                        isDragReject && "border-destructive bg-destructive/5",
                        "cursor-pointer hover:border-primary hover:bg-primary/5",
                      )}
                    >
                      <input {...getInputProps()} />
                      <LuUpload className="mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="text-center text-sm text-muted-foreground">
                        {isDragActive
                          ? t("imageEntry.dropActive")
                          : t("imageEntry.dropInstructions")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("imageEntry.maxSize", {
                          size: Math.round(maxSize / (1024 * 1024)),
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="relative h-40 w-full">
                      <img
                        src={preview}
                        alt="Preview"
                        className="h-full w-full rounded-lg border object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 size-5 rounded-full"
                        onClick={clearSelection}
                      >
                        <LuX className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-4 flex justify-end">{children}</div>
      </form>
    </Form>
  );
}
