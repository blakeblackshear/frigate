import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";

import { z } from "zod";

type TextEntryProps = {
  defaultValue?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  onSave: (text: string) => void;
  children?: React.ReactNode;
};
export default function TextEntry({
  defaultValue,
  placeholder,
  allowEmpty,
  onSave,
  children,
}: TextEntryProps) {
  const formSchema = z.object({
    text: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: defaultValue },
  });
  const fileRef = form.register("text");

  // upload handler

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      if (!allowEmpty && !data["text"]) {
        return;
      }
      onSave(data["text"]);
    },
    [onSave, allowEmpty],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="text"
          render={() => (
            <FormItem>
              <FormControl>
                <Input
                  className="aspect-video h-8 w-full"
                  placeholder={placeholder}
                  type="text"
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
