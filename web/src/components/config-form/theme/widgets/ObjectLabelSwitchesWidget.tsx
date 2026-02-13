// Object Label Switches Widget - For selecting objects via switches
import { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import { FormContext } from "./SwitchesWidget";
import { getTranslatedLabel } from "@/utils/i18n";
import { FrigateConfig } from "@/types/frigateConfig";
import { JsonObject } from "@/types/configForm";

// Collect labelmap values (human-readable labels) from a labelmap object.
function collectLabelmapLabels(labelmap: unknown, labels: Set<string>) {
  if (!labelmap || typeof labelmap !== "object") {
    return;
  }

  Object.values(labelmap as JsonObject).forEach((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      labels.add(value);
    }
  });
}

// Read labelmap labels from the global model and detector models.
function getLabelmapLabels(context: FormContext): string[] {
  const labels = new Set<string>();
  const fullConfig = context.fullConfig as FrigateConfig | undefined;

  if (fullConfig?.model) {
    collectLabelmapLabels(fullConfig.model.labelmap, labels);
  }

  if (fullConfig?.detectors) {
    // detectors is a map of detector configs; each may include a model labelmap.
    Object.values(fullConfig.detectors).forEach((detector) => {
      if (detector?.model?.labelmap) {
        collectLabelmapLabels(detector.model.labelmap, labels);
      }
    });
  }

  return [...labels];
}

// Build the list of labels for switches (labelmap + configured track list).
function getObjectLabels(context: FormContext): string[] {
  const labelmapLabels = getLabelmapLabels(context);
  let cameraLabels: string[] = [];
  let globalLabels: string[] = [];

  if (context) {
    // context.cameraValue and context.globalValue should be the entire objects section
    if (
      context.cameraValue &&
      typeof context.cameraValue === "object" &&
      !Array.isArray(context.cameraValue)
    ) {
      const trackValue = (context.cameraValue as JsonObject).track;
      if (Array.isArray(trackValue)) {
        cameraLabels = trackValue.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }

    if (
      context.globalValue &&
      typeof context.globalValue === "object" &&
      !Array.isArray(context.globalValue)
    ) {
      const globalTrackValue = (context.globalValue as JsonObject).track;
      if (Array.isArray(globalTrackValue)) {
        globalLabels = globalTrackValue.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }
  }

  const sourceLabels = cameraLabels.length > 0 ? cameraLabels : globalLabels;
  const combinedLabels = new Set<string>([...labelmapLabels, ...sourceLabels]);
  return [...combinedLabels].sort();
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
        listClassName:
          "max-h-none overflow-visible md:max-h-64 md:overflow-y-auto md:overscroll-contain md:scrollbar-container",
      }}
    />
  );
}
