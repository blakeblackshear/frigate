// Text Widget - maps to shadcn/ui Input
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";

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

  return (
    <Input
      id={id}
      type="text"
      value={value ?? ""}
      disabled={disabled || readonly}
      placeholder={placeholder || (options.placeholder as string) || ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? undefined : e.target.value)
      }
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
      aria-label={schema.title}
    />
  );
}
