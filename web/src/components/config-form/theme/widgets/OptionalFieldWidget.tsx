// Optional Field Widget - wraps any inner widget with an enable/disable switch
// Used for nullable fields where None means "disabled" (not the same as 0)

import type { WidgetProps } from "@rjsf/utils";
import { getWidget } from "@rjsf/utils";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getNonNullSchema } from "../fields/nullableUtils";

export function OptionalFieldWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options, registry } =
    props;

  const innerWidgetName = (options.innerWidget as string) || undefined;
  const isEnabled = value !== undefined && value !== null;

  // Extract the non-null branch from anyOf [Type, null]
  const innerSchema = getNonNullSchema(schema) ?? schema;

  const InnerWidget = getWidget(innerSchema, innerWidgetName, registry.widgets);

  const getDefaultValue = () => {
    if (innerSchema.default !== undefined && innerSchema.default !== null) {
      return innerSchema.default;
    }
    if (innerSchema.minimum !== undefined) {
      return innerSchema.minimum;
    }
    if (innerSchema.type === "integer" || innerSchema.type === "number") {
      return 0;
    }
    if (innerSchema.type === "string") {
      return "";
    }
    return 0;
  };

  const handleToggle = (checked: boolean) => {
    onChange(checked ? getDefaultValue() : undefined);
  };

  const innerProps: WidgetProps = {
    ...props,
    schema: innerSchema,
    disabled: disabled || readonly || !isEnabled,
    value: isEnabled ? value : getDefaultValue(),
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        id={`${id}-toggle`}
        checked={isEnabled}
        disabled={disabled || readonly}
        onCheckedChange={handleToggle}
      />
      <div
        className={cn("flex-1", !isEnabled && "pointer-events-none opacity-40")}
      >
        <InnerWidget {...innerProps} />
      </div>
    </div>
  );
}
