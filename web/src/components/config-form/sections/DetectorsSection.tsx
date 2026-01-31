// Detectors Section Component
// Global detectors configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const DetectorsSection = createConfigSection({
  sectionPath: "detectors",
  defaultConfig: getSectionConfig("detectors", "global"),
});

export default DetectorsSection;
