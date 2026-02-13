// Audio Label Switches Widget - For selecting audio labels via switches
import type { WidgetProps } from "@rjsf/utils";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";
import { getTranslatedLabel } from "@/utils/i18n";
import { JsonObject } from "@/types/configForm";

function getEnabledAudioLabels(context: FormContext): string[] {
  let cameraLabels: string[] = [];
  let globalLabels: string[] = [];

  if (context) {
    // context.cameraValue and context.globalValue should be the entire audio section
    if (
      context.cameraValue &&
      typeof context.cameraValue === "object" &&
      !Array.isArray(context.cameraValue)
    ) {
      const listenValue = (context.cameraValue as JsonObject).listen;
      if (Array.isArray(listenValue)) {
        cameraLabels = listenValue.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }

    if (
      context.globalValue &&
      typeof context.globalValue === "object" &&
      !Array.isArray(context.globalValue)
    ) {
      const globalListenValue = (context.globalValue as JsonObject).listen;
      if (Array.isArray(globalListenValue)) {
        globalLabels = globalListenValue.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }
  }

  const sourceLabels = cameraLabels.length > 0 ? cameraLabels : globalLabels;
  return [...sourceLabels].sort();
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
          "max-h-none overflow-visible md:max-h-64 md:overflow-y-auto md:overscroll-contain md:scrollbar-container",
        enableSearch: true,
      }}
    />
  );
}
