import type { SectionConfigOverrides } from "./types";

const birdseye: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/birdseye",
    messages: [
      {
        key: "object-tracking-detect-disabled",
        messageKey: "configMessages.birdseye.objectTrackingDetectDisabled",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          const modes = ctx.formData?.modes;
          if (!Array.isArray(modes)) {
            return false;
          }

          return (
            modes.includes("all_objects") &&
            ctx.fullCameraConfig.detect?.enabled === false
          );
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["enabled", "modes", "order"],
    hiddenFields: ["order"],
    advancedFields: [],
    overrideFields: ["enabled", "modes"],
    uiSchema: {
      modes: {
        "ui:widget": "birdseyeModes",
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
      "modes",
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
      modes: {
        "ui:after": { render: "BirdseyeCameraReorder" },
      },
    },
  },
};

export default birdseye;
