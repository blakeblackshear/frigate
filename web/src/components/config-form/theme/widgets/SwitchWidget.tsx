// Switch Widget - maps to shadcn/ui Switch
import type { WidgetProps } from "@rjsf/utils";
import { Switch } from "@/components/ui/switch";

export function SwitchWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, label, schema } = props;

  return (
    <Switch
      id={id}
      checked={typeof value === "undefined" ? false : value}
      disabled={disabled || readonly}
      onCheckedChange={(checked) => onChange(checked)}
      aria-label={label || schema.title || "Toggle"}
    />
  );
}
