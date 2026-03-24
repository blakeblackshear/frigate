// Widget that displays an array as a concatenated text string
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { useCallback } from "react";

export function ArrayAsTextWidget(props: WidgetProps) {
  const { value, onChange, disabled, readonly, placeholder } = props;

  // Convert array or string to text
  let textValue = "";
  if (typeof value === "string" && value.length > 0) {
    textValue = value;
  } else if (Array.isArray(value) && value.length > 0) {
    textValue = value.join(" ");
  }

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newText = event.target.value;
      // Convert space-separated string back to array
      const newArray = newText.trim() ? newText.trim().split(/\s+/) : [];
      onChange(newArray);
    },
    [onChange],
  );

  return (
    <Input
      value={textValue}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder}
    />
  );
}
