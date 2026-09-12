// Optional Field Widget - wraps any inner widget with an enable/disable switch
// Used for nullable fields where None means "disabled" (not the same as 0)

import type { WidgetProps } from "@rjsf/utils";
import { getWidget } from "@rjsf/utils";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getNonNullSchema } from "../fields/nullableUtils";
import type { ConfigFormContext } from "@/types/configForm";

export function OptionalFieldWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options, registry } =
    props;

  const innerWidgetName = (options.innerWidget as string) || undefined;
  const isEnabled = value !== undefined && value !== null;
  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const isProfile = !!formContext?.isProfile;

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
    disabled: disabled || readonly || (!isProfile && !isEnabled),
    value: isEnabled ? value : getDefaultValue(),
  };

  // don't show the switch if we're editing in a profile
  // to disable in a profile, users should edit the config manually, eg:
  // skip_motion_threshold: None
  if (isProfile) {
    return <InnerWidget {...innerProps} />;
  }

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
