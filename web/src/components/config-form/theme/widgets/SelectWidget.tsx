// Select Widget - maps to shadcn/ui Select
import type { WidgetProps } from "@rjsf/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSizedFieldClassName } from "../utils";

export function SelectWidget(props: WidgetProps) {
  const {
    id,
    options,
    value,
    disabled,
    readonly,
    onChange,
    placeholder,
    schema,
  } = props;

  const { enumOptions = [] } = options;
  const fieldClassName = getSizedFieldClassName(options, "sm");

  return (
    <Select
      value={value?.toString() ?? ""}
      onValueChange={(val) => {
        // Convert back to original type if needed
        const enumVal = enumOptions.find(
          (opt: { value: unknown }) => opt.value?.toString() === val,
        );
        onChange(enumVal ? enumVal.value : val);
      }}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className={fieldClassName}>
        <SelectValue placeholder={placeholder || schema.title || "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((option: { value: unknown; label: string }) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
