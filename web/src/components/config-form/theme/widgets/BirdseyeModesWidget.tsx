// Birdseye Modes Widget - For selecting Birdseye activity types via switches
import type { WidgetProps } from "@rjsf/utils";
import { SwitchesWidget } from "./SwitchesWidget";
import type { FormContext } from "./SwitchesWidget";

// order matches BirdseyeModeEnum in frigate/config/camera/birdseye.py
const BIRDSEYE_MODES: string[] = [
  "continuous",
  "motion",
  "all_objects",
  "alerts",
  "detections",
];

function getBirdseyeModes(): string[] {
  return BIRDSEYE_MODES;
}

function getBirdseyeModeLabel(mode: string, context?: FormContext): string {
  const t = context?.t;

  if (!t) {
    return mode;
  }

  return t(`configForm.birdseyeModes.options.${mode}`, {
    ns: "views/settings",
    defaultValue: mode,
  });
}

export function BirdseyeModesWidget(props: WidgetProps) {
  return (
    <SwitchesWidget
      {...props}
      options={{
        ...props.options,
        getEntities: getBirdseyeModes,
        getDisplayLabel: getBirdseyeModeLabel,
        i18nKey: "birdseyeModes",
      }}
    />
  );
}
