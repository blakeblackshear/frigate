// Text Widget - maps to shadcn/ui Input
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSizedFieldClassName } from "../utils";

export function TextWidget(props: WidgetProps) {
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
  const fieldClassName = getSizedFieldClassName(options, "xs");

  return (
    <Input
      id={id}
      className={cn("text-md", fieldClassName)}
      type="text"
      value={value ?? ""}
      disabled={disabled || readonly}
      placeholder={placeholder || (options.placeholder as string) || ""}
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
