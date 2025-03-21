import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";

import { z } from "zod";

type ImageEntryProps = {
  onSave: (file: File) => void;
  children?: React.ReactNode;
};
export default function ImageEntry({ onSave, children }: ImageEntryProps) {
  const formSchema = z.object({
    file: z.instanceof(FileList, { message: "Please select an image file." }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const fileRef = form.register("file");

  // upload handler

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      if (!data["file"] || Object.keys(data.file).length == 0) {
        return;
      }

      onSave(data["file"]["0"]);
    },
    [onSave],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormControl>
                <Input
                  className="aspect-video h-40 w-full"
                  type="file"
                  {...fileRef}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {children}
      </form>
    </Form>
  );
}
