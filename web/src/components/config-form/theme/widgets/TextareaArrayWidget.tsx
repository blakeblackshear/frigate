// Textarea Array Widget - displays an array of strings as a multiline textarea
// Each line in the textarea corresponds to one item in the array.
import type { WidgetProps } from "@rjsf/utils";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getSizedFieldClassName } from "../utils";
import { useCallback } from "react";

export function TextareaArrayWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, onBlur, onFocus, schema, options } =
    props;

  // Convert array to newline-separated text for display
  let textValue = "";
  if (Array.isArray(value) && value.length > 0) {
    textValue = value.join("\n");
  } else if (typeof value === "string") {
    textValue = value;
  }

  const fieldClassName = getSizedFieldClassName(options, "md");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      if (text === "") {
        onChange([]);
        return;
      }
      // Split by newlines and filter out empty lines
      const items = text.split("\n").filter((line) => line.trim() !== "");
      onChange(items);
    },
    [onChange],
  );

  return (
    <Textarea
      id={id}
      className={cn("text-md", fieldClassName)}
      value={textValue}
      disabled={disabled || readonly}
      rows={(options.rows as number) || 3}
      onChange={handleChange}
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
      aria-label={schema.title}
    />
  );
}
