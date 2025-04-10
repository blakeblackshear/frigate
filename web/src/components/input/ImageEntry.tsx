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
import { useCallback, useState } from "react";
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

  const formSchema = z.object({
    file: z.instanceof(File, { message: "Please select an image file." }),
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

        // Clean up preview URL when component unmounts
        return () => URL.revokeObjectURL(objectUrl);
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
                <div className="w-full">
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
