// Detect Section Component
// Reusable for both global and camera-level detect settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const DetectSection = createConfigSection({
  sectionPath: "detect",
  defaultConfig: getSectionConfig("detect", "camera"),
});

export default DetectSection;
