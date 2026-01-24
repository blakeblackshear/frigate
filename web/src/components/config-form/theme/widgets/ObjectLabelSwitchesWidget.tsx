// Object Label Switches Widget - For selecting objects via switches
import type { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";
import { getTranslatedLabel } from "@/utils/i18n";

function getObjectLabels(context: FormContext): string[] {
  let cameraLabels: string[] = [];
  let globalLabels: string[] = [];

  if (context) {
    // context.cameraValue and context.globalValue should be the entire objects section
    const trackValue = context.cameraValue?.track;
    if (Array.isArray(trackValue)) {
      cameraLabels = trackValue.filter(
        (item): item is string => typeof item === "string",
      );
    }

    const globalTrackValue = context.globalValue?.track;
    if (Array.isArray(globalTrackValue)) {
      globalLabels = globalTrackValue.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }

  const sourceLabels = cameraLabels.length > 0 ? cameraLabels : globalLabels;
  return [...sourceLabels].sort();
}

function getObjectLabelDisplayName(label: string): string {
  return getTranslatedLabel(label, "object");
}

export function ObjectLabelSwitchesWidget(props: WidgetProps) {
  return (
    <SwitchesWidget
      {...props}
      options={{
        ...props.options,
        getEntities: getObjectLabels,
        getDisplayLabel: getObjectLabelDisplayName,
        i18nKey: "objectLabels",
      }}
    />
  );
}
