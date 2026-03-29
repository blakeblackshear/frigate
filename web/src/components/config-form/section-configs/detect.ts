import type { SectionConfigOverrides } from "./types";

const detect: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/camera_specific",
    fieldMessages: [
      {
        key: "fps-greater-than-five",
        field: "fps",
        messageKey: "configMessages.detect.fpsGreaterThanFive",
        severity: "info",
        position: "after",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          const detectFps = ctx.formData?.fps as number | undefined;
          const streamFps = ctx.fullCameraConfig.detect?.fps;
          return detectFps != null && streamFps != null && detectFps > 5;
        },
      },
    ],
    fieldOrder: [
      "enabled",
      "width",
      "height",
      "fps",
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
      "interval",
      "threshold",
      "max_frames",
    ],
    restartRequired: [],
    fieldGroups: {
      resolution: ["width", "height", "fps"],
      tracking: ["min_initialized", "max_disappeared"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: [
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
  },
  global: {
    restartRequired: [
      "fps",
      "width",
      "height",
      "min_initialized",
      "max_disappeared",
    ],
  },
  camera: {
    restartRequired: [
      "fps",
      "width",
      "height",
      "min_initialized",
      "max_disappeared",
    ],
  },
};

export default detect;
