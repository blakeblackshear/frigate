// Base Input Template - default input wrapper
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";

export function BaseInputTemplate(props: WidgetProps) {
  const {
    id,
    type,
    value,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    schema,
  } = props;

  const inputType = type || "text";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (inputType === "number") {
      const num = parseFloat(val);
      onChange(val === "" ? undefined : isNaN(num) ? undefined : num);
    } else {
      onChange(val === "" ? undefined : val);
    }
  };

  return (
    <Input
      id={id}
      type={inputType}
      value={value ?? ""}
      disabled={disabled || readonly}
      placeholder={placeholder || ""}
      onChange={handleChange}
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
      aria-label={schema.title}
    />
  );
}
