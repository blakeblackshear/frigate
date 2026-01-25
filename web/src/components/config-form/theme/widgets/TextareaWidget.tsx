// Textarea Widget - maps to shadcn/ui Textarea
import type { WidgetProps } from "@rjsf/utils";
import { Textarea } from "@/components/ui/textarea";

export function TextareaWidget(props: WidgetProps) {
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

  const isNullable = Array.isArray(schema.type)
    ? schema.type.includes("null")
    : false;

  return (
    <Textarea
      id={id}
      value={value ?? ""}
      disabled={disabled || readonly}
      placeholder={placeholder || (options.placeholder as string) || ""}
      rows={(options.rows as number) || 3}
      onChange={(e) =>
        onChange(
          e.target.value === ""
            ? isNullable
              ? null
              : undefined
            : e.target.value,
        )
      }
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
      aria-label={schema.title}
    />
  );
}
