// Widget that displays an array as editable text.
// Single-line mode (default): space-separated in an Input.
// Multiline mode (options.multiline): one item per line in a Textarea.
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getSizedFieldClassName } from "../utils";
import { useCallback, useEffect, useState } from "react";

function arrayToText(value: unknown, multiline: boolean): string {
  const sep = multiline ? "\n" : " ";
  if (Array.isArray(value) && value.length > 0) {
    return value.join(sep);
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function textToArray(text: string, multiline: boolean): string[] {
  if (text.trim() === "") {
    return [];
  }
  return multiline
    ? text.split("\n").filter((line) => line.trim() !== "")
    : text.trim().split(/\s+/);
}

export function ArrayAsTextWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    schema,
    options,
  } = props;

  const multiline = !!(options.multiline as boolean);

  // Local state keeps raw text so newlines aren't stripped mid-typing
  const [text, setText] = useState(() => arrayToText(value, multiline));

  useEffect(() => {
    setText(arrayToText(value, multiline));
  }, [value, multiline]);

  const fieldClassName = multiline
    ? getSizedFieldClassName(options, "md")
    : undefined;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setText(raw);
      onChange(textToArray(raw, multiline));
    },
    [onChange, multiline],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Clean up: strip empty entries and sync
      const cleaned = textToArray(e.target.value, multiline);
      onChange(cleaned);
      setText(arrayToText(cleaned, multiline));
      onBlur?.(id, e.target.value);
    },
    [id, onChange, onBlur, multiline],
  );

  if (multiline) {
    return (
      <Textarea
        id={id}
        className={cn("text-md", fieldClassName)}
        value={text}
        disabled={disabled || readonly}
        rows={(options.rows as number) || 3}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={(e) => onFocus?.(id, e.target.value)}
        aria-label={schema.title}
      />
    );
  }

  return (
    <Input
      value={text}
      onChange={handleInputChange}
      onBlur={handleBlur}
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder}
    />
  );
}
