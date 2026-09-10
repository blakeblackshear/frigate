import type { FormContext } from "../theme/widgets/SwitchesWidget";
import type { SectionConfigOverrides } from "./types";

const BIRDSEYE_MODES = ["continuous", "motion", "objects"];

const getModeLabel = (mode: string, context?: FormContext) =>
  context?.t?.(`birdseye.trackingMode.${mode}`, { ns: "views/settings" }) ??
  mode;

// mode is a single mode or a list of modes that are OR'd together
const hasMode = (mode: unknown, wanted: string) =>
  Array.isArray(mode) ? mode.includes(wanted) : mode === wanted;

const birdseye: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/birdseye",
    messages: [
      {
        key: "objects-mode-detect-disabled",
        messageKey: "configMessages.birdseye.objectsModeDetectDisabled",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          return (
            hasMode(ctx.formData?.mode, "objects") &&
            ctx.fullCameraConfig.detect?.enabled === false
          );
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["enabled", "mode", "order"],
    hiddenFields: ["order"],
    advancedFields: [],
    overrideFields: ["enabled", "mode"],
    uiSchema: {
      // more than one mode can be selected, so the field is a switch per mode
      // rather than a select
      mode: {
        "ui:widget": "switches",
        "ui:options": {
          getEntities: () => BIRDSEYE_MODES,
          getDisplayLabel: getModeLabel,
          i18nKey: "birdseyeModes",
        },
      },
    },
  },
  global: {
    fieldOrder: [
      "enabled",
      "restream",
      "width",
      "height",
      "quality",
      "mode",
      "layout",
      "inactivity_threshold",
      "idle_heartbeat_fps",
    ],
    advancedFields: ["width", "height", "quality", "inactivity_threshold"],
    restartRequired: [
      "enabled",
      "restream",
      "width",
      "height",
      "quality",
      "layout.scaling_factor",
      "idle_heartbeat_fps",
    ],
    uiSchema: {
      mode: {
        "ui:after": { render: "BirdseyeCameraReorder" },
      },
    },
  },
};

export default birdseye;
