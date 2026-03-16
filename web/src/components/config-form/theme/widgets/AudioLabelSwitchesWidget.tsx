// Audio Label Switches Widget - For selecting audio labels via switches
import type { WidgetProps } from "@rjsf/utils";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";
import { getTranslatedLabel } from "@/utils/i18n";
import { JsonObject } from "@/types/configForm";

function extractListenLabels(value: unknown): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const listenValue = (value as JsonObject).listen;
    if (Array.isArray(listenValue)) {
      return listenValue.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }
  return [];
}

function getEnabledAudioLabels(context: FormContext): string[] {
  let cameraLabels: string[] = [];
  let globalLabels: string[] = [];
  let formDataLabels: string[] = [];

  if (context) {
    // context.cameraValue and context.globalValue should be the entire audio section
    cameraLabels = extractListenLabels(context.cameraValue);
    globalLabels = extractListenLabels(context.globalValue);

    // Include labels from the current form data so that labels added via
    // profile overrides (or user edits) are always visible as switches.
    formDataLabels = extractListenLabels(context.formData);
  }

  const sourceLabels = cameraLabels.length > 0 ? cameraLabels : globalLabels;
  return [...new Set([...sourceLabels, ...formDataLabels])].sort();
}

function getAudioLabelDisplayName(label: string): string {
  return getTranslatedLabel(label, "audio");
}

export function AudioLabelSwitchesWidget(props: WidgetProps) {
  const { data: audioLabels } = useSWR<Record<string, string>>("/audio_labels");

  const allLabels = useMemo(() => {
    if (!audioLabels) {
      return [];
    }

    const labelSet = new Set<string>();
    Object.values(audioLabels).forEach((label) => {
      if (typeof label !== "string") {
        return;
      }
      const normalized = label.trim();
      if (normalized) {
        labelSet.add(normalized);
      }
    });

    return [...labelSet].sort();
  }, [audioLabels]);

  const getEntities = useCallback(
    (context: FormContext) => {
      const enabledLabels = getEnabledAudioLabels(context);

      if (allLabels.length === 0) {
        return enabledLabels;
      }

      const combinedLabels = new Set([...allLabels, ...enabledLabels]);
      return [...combinedLabels].sort();
    },
    [allLabels],
  );

  return (
    <SwitchesWidget
      {...props}
      options={{
        ...props.options,
        getEntities,
        getDisplayLabel: getAudioLabelDisplayName,
        i18nKey: "audioLabels",
        listClassName:
          "relative max-h-none overflow-visible md:max-h-64 md:overflow-y-auto md:overscroll-contain md:scrollbar-container",
        enableSearch: true,
      }}
    />
  );
}
