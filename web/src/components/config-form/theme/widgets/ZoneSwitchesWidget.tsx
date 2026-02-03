// Zone Switches Widget - For selecting zones via switches
import type { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";

function getZoneNames(context: FormContext): string[] {
  if (context?.fullCameraConfig) {
    const zones = context.fullCameraConfig.zones;
    if (typeof zones === "object" && zones !== null) {
      // zones is a dict/object, get the keys
      return Object.keys(zones).sort();
    }
  }
  return [];
}

function getZoneDisplayName(zoneName: string, context?: FormContext): string {
  // Try to get the config from context
  // In the config form context, we may not have the full config directly,
  // so we'll try to use the zone config if available
  if (context?.fullCameraConfig?.zones) {
    const zones = context.fullCameraConfig.zones;
    if (typeof zones === "object" && zones !== null) {
      const zoneConfig = (zones as Record<string, { friendly_name?: string }>)[
        zoneName
      ];
      if (zoneConfig?.friendly_name) {
        return zoneConfig.friendly_name;
      }
    }
  }
  // Fallback to cleaning up the zone name
  return String(zoneName).replace(/_/g, " ");
}

export function ZoneSwitchesWidget(props: WidgetProps) {
  return (
    <SwitchesWidget
      {...props}
      options={{
        ...props.options,
        getEntities: getZoneNames,
        getDisplayLabel: getZoneDisplayName,
        i18nKey: "zoneNames",
        listClassName: "max-h-64 overflow-y-auto scrollbar-container",
      }}
    />
  );
}
