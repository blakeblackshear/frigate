import type { SectionConfigOverrides } from "./types";

const detect: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/camera_specific",
    messages: [
      {
        key: "detect-disabled",
        messageKey: "configMessages.detect.disabled",
        severity: "info",
        condition: (ctx) =>
          ctx.level === "camera" && ctx.formData?.enabled === false,
      },
      {
        key: "detect-resolution-not-multiple-of-four",
        messageKey: "configMessages.detect.resolutionShouldBeMultipleOfFour",
        severity: "warning",
        condition: (ctx) => {
          const width = ctx.formData?.width as number | null | undefined;
          const height = ctx.formData?.height as number | null | undefined;
          const isEvenButNotFour = (v: unknown) =>
            typeof v === "number" && v % 2 === 0 && v % 4 !== 0;
          return isEvenButNotFour(width) || isEvenButNotFour(height);
        },
      },
      {
        key: "detect-aspect-ratio-mismatch",
        messageKey: "configMessages.detect.aspectRatioMismatch",
        severity: "warning",
        condition: (ctx) => {
          const newWidth = ctx.formData?.width as number | null | undefined;
          const newHeight = ctx.formData?.height as number | null | undefined;
          if (typeof newWidth !== "number" || typeof newHeight !== "number") {
            return false;
          }
          const saved =
            ctx.level === "camera"
              ? ctx.fullCameraConfig?.detect
              : ctx.fullConfig?.detect;
          const savedWidth = saved?.width;
          const savedHeight = saved?.height;
          if (
            typeof savedWidth !== "number" ||
            typeof savedHeight !== "number" ||
            savedWidth <= 0 ||
            savedHeight <= 0
          ) {
            return false;
          }
          if (newWidth === savedWidth && newHeight === savedHeight) {
            return false;
          }
          const newRatio = newWidth / newHeight;
          const savedRatio = savedWidth / savedHeight;
          return Math.abs(newRatio - savedRatio) > 0.01;
        },
      },
    ],
    fieldMessages: [
      {
        key: "fps-greater-than-five",
        field: "fps",
        messageKey: "configMessages.detect.fpsGreaterThanFive",
        severity: "info",
        position: "after",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          if (ctx.fullCameraConfig.type === "lpr") return false;
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
  replay: {
    restartRequired: [],
    fieldOrder: ["width", "height", "fps"],
    fieldGroups: {
      resolution: ["width", "height", "fps"],
    },
    hiddenFields: [
      "enabled",
      "enabled_in_config",
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
      "interval",
      "threshold",
      "max_frames",
    ],
    advancedFields: [],
  },
};

export default detect;
