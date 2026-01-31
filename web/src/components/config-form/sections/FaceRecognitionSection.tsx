// Face Recognition Section Component
// Camera-level face recognition settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const FaceRecognitionSection = createConfigSection({
  sectionPath: "face_recognition",
  defaultConfig: getSectionConfig("face_recognition", "camera"),
});

export default FaceRecognitionSection;
