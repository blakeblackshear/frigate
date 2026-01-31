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
  regexPattern?: RegExp;
  regexErrorMessage?: string;
  forbiddenPattern?: RegExp;
  forbiddenErrorMessage?: string;
};

export default function TextEntry({
  defaultValue = "",
  placeholder,
  allowEmpty = false,
  onSave,
  children,
  regexPattern,
  regexErrorMessage = "Input does not match the required format",
  forbiddenPattern,
  forbiddenErrorMessage = "Input contains invalid characters",
}: TextEntryProps) {
  const formSchema = z.object({
    text: z
      .string()
      .optional()
      .refine((val) => !val || !forbiddenPattern?.test(val), {
        message: forbiddenErrorMessage,
      })
      .refine(
        (val) => {
          if (!allowEmpty && !val) return false;
          if (val && regexPattern) return regexPattern.test(val);
          return true;
        },
        {
          message: regexPattern ? regexErrorMessage : "Field is required",
        },
      ),
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
