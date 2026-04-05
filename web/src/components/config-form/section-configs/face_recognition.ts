import type { SectionConfigOverrides } from "./types";

const faceRecognition: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/face_recognition",
    messages: [
      {
        key: "global-disabled",
        messageKey: "configMessages.faceRecognition.globalDisabled",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level !== "camera") return false;
          return ctx.fullConfig.face_recognition?.enabled === false;
        },
      },
      {
        key: "person-not-tracked",
        messageKey: "configMessages.faceRecognition.personNotTracked",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          return !ctx.fullCameraConfig.objects?.track?.includes("person");
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["enabled", "min_area"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: ["enabled", "min_area"],
  },
  global: {
    fieldOrder: [
      "enabled",
      "model_size",
      "unknown_score",
      "detection_threshold",
      "recognition_threshold",
      "min_area",
      "min_faces",
      "save_attempts",
      "blur_confidence_filter",
      "device",
    ],
    advancedFields: [
      "unknown_score",
      "detection_threshold",
      "recognition_threshold",
      "min_area",
      "min_faces",
      "save_attempts",
      "blur_confidence_filter",
      "device",
    ],
    restartRequired: ["enabled", "model_size", "device"],
  },
};

export default faceRecognition;
