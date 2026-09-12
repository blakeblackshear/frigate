// Number Widget - Input with number type
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";

export function NumberWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    schema,
    options,
  } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(undefined);
    } else {
      const num =
        schema.type === "integer" ? parseInt(val, 10) : parseFloat(val);
      onChange(isNaN(num) ? undefined : num);
    }
  };

  return (
    <Input
      id={id}
      type="number"
      value={value ?? ""}
      disabled={disabled || readonly}
      min={schema.minimum}
      max={schema.maximum}
      step={(options.step as number) || (schema.type === "integer" ? 1 : 0.1)}
      onChange={handleChange}
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
      aria-label={schema.title}
    />
  );
}
