// Camera UI Section Component
// Camera UI display settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const CameraUiSection = createConfigSection({
  sectionPath: "ui",
  defaultConfig: getSectionConfig("ui", "camera"),
});

export default CameraUiSection;
