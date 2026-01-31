// License Plate Recognition Section Component
// Camera-level LPR settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const LprSection = createConfigSection({
  sectionPath: "lpr",
  defaultConfig: getSectionConfig("lpr", "camera"),
});

export default LprSection;
