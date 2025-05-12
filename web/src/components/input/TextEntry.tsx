import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
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
  defaultValue = "",
  placeholder,
  allowEmpty = false,
  onSave,
  children,
}: TextEntryProps) {
  const formSchema = z.object({
    text: allowEmpty
      ? z.string().optional()
      : z.string().min(1, "Field is required"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: defaultValue },
  });

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      onSave(data.text || "");
    },
    [onSave],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  className="text-md w-full"
                  placeholder={placeholder}
                  type="text"
                />
              </FormControl>
              <FormMessage className="text-xs text-destructive" />
            </FormItem>
          )}
        />
        {children}
      </form>
    </Form>
  );
}
