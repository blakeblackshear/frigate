// Object Label Switches Widget - For selecting objects via switches
import { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import { FormContext } from "./SwitchesWidget";
import i18n, { getTranslatedLabel } from "@/utils/i18n";
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

// Extract track labels from an objects section value.
function extractTrackLabels(value: unknown): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const trackValue = (value as JsonObject).track;
    if (Array.isArray(trackValue)) {
      return trackValue.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }
  return [];
}

// Build the list of labels for switches (labelmap + configured track list).
function getObjectLabels(context: FormContext): string[] {
  const labelmapLabels = getLabelmapLabels(context);
  let cameraLabels: string[] = [];
  let globalLabels: string[] = [];
  let formDataLabels: string[] = [];

  if (context) {
    // context.cameraValue and context.globalValue should be the entire objects section
    cameraLabels = extractTrackLabels(context.cameraValue);
    globalLabels = extractTrackLabels(context.globalValue);

    // Include labels from the current form data so that labels added via
    // profile overrides (or user edits) are always visible as switches.
    formDataLabels = extractTrackLabels(context.formData);
  }

  const sourceLabels = cameraLabels.length > 0 ? cameraLabels : globalLabels;
  const combinedLabels = new Set<string>([
    ...labelmapLabels,
    ...sourceLabels,
    ...formDataLabels,
  ]);
  return [...combinedLabels].sort((a, b) =>
    getObjectLabelDisplayName(a).localeCompare(
      getObjectLabelDisplayName(b),
      i18n.language,
    ),
  );
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
          "relative max-h-none overflow-visible md:max-h-64 md:overflow-y-auto md:overscroll-contain md:scrollbar-container",
      }}
    />
  );
}
