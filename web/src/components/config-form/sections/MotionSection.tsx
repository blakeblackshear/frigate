// Motion Section Component
// Reusable for both global and camera-level motion settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const MotionSection = createConfigSection({
  sectionPath: "motion",
  defaultConfig: getSectionConfig("motion", "camera"),
});

export default MotionSection;
