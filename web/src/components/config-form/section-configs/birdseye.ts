import type { SectionConfigOverrides } from "./types";

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
            ctx.formData?.mode === "objects" &&
            ctx.fullCameraConfig.detect?.enabled === false
          );
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["enabled", "mode", "order"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: ["enabled", "mode"],
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
        "ui:size": "xs",
      },
    },
  },
};

export default birdseye;
