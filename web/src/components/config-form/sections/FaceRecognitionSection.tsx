// Face Recognition Section Component
// Camera-level face recognition settings

import { createConfigSection } from "./BaseSection";

export const FaceRecognitionSection = createConfigSection({
  sectionPath: "face_recognition",
  defaultConfig: {
    fieldOrder: ["enabled", "min_area"],
    hiddenFields: [],
    advancedFields: ["min_area"],
    overrideFields: ["enabled", "min_area"],
  },
});

export default FaceRecognitionSection;
