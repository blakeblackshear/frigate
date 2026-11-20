import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  convertHeicToJpeg,
  HEIC_EXTENSIONS,
  isHeicFile,
} from "@/utils/heicUtil";
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
  accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ...HEIC_EXTENSIONS],
  },
}: ImageEntryProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  // Bumped on every selection and clear, so a HEIC conversion that finishes
  // after the selection changed is discarded instead of applied
  const selectionId = useRef(0);

  // Discard conversions that finish after the component unmounts
  useEffect(() => {
    const id = selectionId;
    return () => {
      id.current += 1;
    };
  }, []);

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

  const selectFile = useCallback(
    async (file: File) => {
      const id = ++selectionId.current;
      let selected = file;

      if (isHeicFile(file)) {
        setConverting(true);
        const converted = await convertHeicToJpeg(file).catch(() => null);

        // the selection was cleared or replaced while converting
        if (id !== selectionId.current) {
          return;
        }

        setConverting(false);

        if (!converted) {
          form.setError("file", {
            message: t("imageEntry.validation.heicConversionFailed"),
          });
          return;
        }

        selected = converted;
      }

      form.setValue("file", selected, { shouldValidate: true });

      // Create preview
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    },
    [form, t],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        selectFile(acceptedFiles[0]);
      }
    },
    [selectFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      maxSize,
      accept,
      multiple: false,
      disabled: converting,
    });

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (converting) {
        return;
      }

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
              selectFile(file);
              return; // Take the first valid image
            }
          }
        }
      }
    },
    [converting, maxSize, accept, selectFile],
  );

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      // the form still holds the previous image until a replacement
      // finishes converting, so saving now would upload the wrong one
      if (!data.file || converting) return;
      onSave(data.file);
    },
    [converting, onSave],
  );

  const clearSelection = () => {
    // drop any running conversion so it can't restore the selection
    selectionId.current += 1;
    setConverting(false);
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
                        converting
                          ? "cursor-wait"
                          : "cursor-pointer hover:border-primary hover:bg-primary/5",
                      )}
                    >
                      <input {...getInputProps()} />
                      {converting ? (
                        <>
                          <ActivityIndicator className="mb-2" />
                          <p className="text-center text-sm text-muted-foreground">
                            {t("imageEntry.converting")}
                          </p>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-40 w-full">
                      <img
                        src={preview}
                        alt="Preview"
                        className="h-full w-full rounded-lg border object-contain"
                      />
                      {converting && (
                        <div className="absolute inset-0 flex cursor-wait flex-col items-center justify-center rounded-lg bg-background/80">
                          <ActivityIndicator className="mb-2" />
                          <p className="text-center text-sm text-muted-foreground">
                            {t("imageEntry.converting")}
                          </p>
                        </div>
                      )}
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
