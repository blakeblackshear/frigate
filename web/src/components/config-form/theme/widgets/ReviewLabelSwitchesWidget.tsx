// Review Label Switches Widget - For selecting review alert/detection labels via switches.
// Combines object labels (from objects.track) and audio labels (from audio.listen)
// since review labels can include both types.
import type { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";
import { getTranslatedLabel } from "@/utils/i18n";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { JsonObject } from "@/types/configForm";

function getReviewLabels(context: FormContext): string[] {
  const labels = new Set<string>();
  const fullConfig = context.fullConfig as FrigateConfig | undefined;
  const fullCameraConfig = context.fullCameraConfig;

  // Object labels from tracked objects (camera-level, falling back to global)
  const trackLabels =
    fullCameraConfig?.objects?.track ?? fullConfig?.objects?.track;
  if (Array.isArray(trackLabels)) {
    trackLabels.forEach((label: string) => labels.add(label));
  }

  // Audio labels from listen config, only if audio detection is enabled
  const audioEnabled =
    fullCameraConfig?.audio?.enabled_in_config ??
    fullConfig?.audio?.enabled_in_config;
  if (audioEnabled) {
    const audioLabels =
      fullCameraConfig?.audio?.listen ?? fullConfig?.audio?.listen;
    if (Array.isArray(audioLabels)) {
      audioLabels.forEach((label: string) => labels.add(label));
    }
  }

  // Include any labels already in the review form data (alerts + detections)
  // so that previously saved labels remain visible even if tracking config changed
  if (context.formData && typeof context.formData === "object") {
    const formData = context.formData as JsonObject;
    for (const section of ["alerts", "detections"] as const) {
      const sectionData = formData[section];
      if (sectionData && typeof sectionData === "object") {
        const sectionLabels = (sectionData as JsonObject).labels;
        if (Array.isArray(sectionLabels)) {
          sectionLabels.forEach((label) => {
            if (typeof label === "string") {
              labels.add(label);
            }
          });
        }
      }
    }
  }

  return [...labels].sort();
}

function getReviewLabelDisplayName(
  label: string,
  context?: FormContext,
): string {
  const fullCameraConfig = context?.fullCameraConfig;
  const fullConfig = context?.fullConfig as FrigateConfig | undefined;
  const audioLabels =
    fullCameraConfig?.audio?.listen ?? fullConfig?.audio?.listen;
  const isAudio = Array.isArray(audioLabels) && audioLabels.includes(label);
  return getTranslatedLabel(label, isAudio ? "audio" : "object");
}

export function ReviewLabelSwitchesWidget(props: WidgetProps) {
  return (
    <SwitchesWidget
      {...props}
      options={{
        ...props.options,
        getEntities: getReviewLabels,
        getDisplayLabel: getReviewLabelDisplayName,
        i18nKey: "reviewLabels",
        listClassName:
          "relative max-h-none overflow-visible md:max-h-64 md:overflow-y-auto md:overscroll-contain md:scrollbar-container",
      }}
    />
  );
}
