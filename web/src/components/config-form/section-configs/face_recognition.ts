import type { SectionConfigOverrides } from "./types";

const faceRecognition: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/face_recognition",
    restartRequired: [],
    fieldOrder: ["enabled", "min_area"],
    hiddenFields: [],
    advancedFields: ["min_area"],
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
    restartRequired: [
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
  },
};

export default faceRecognition;
