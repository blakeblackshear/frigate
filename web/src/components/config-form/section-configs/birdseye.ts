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
          const mode = ctx.formData?.mode;
          if (!mode || typeof mode !== "object" || Array.isArray(mode)) {
            return false;
          }

          return (
            (mode.objects === true || mode.stationary_objects === true) &&
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
      mode: {
        continuous: { "ui:size": "xs" },
        motion: { "ui:size": "xs" },
        objects: { "ui:size": "xs" },
        stationary_objects: { "ui:size": "xs" },
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
