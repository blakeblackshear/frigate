// Classification Section Component
// Global classification configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const ClassificationSection = createConfigSection({
  sectionPath: "classification",
  defaultConfig: getSectionConfig("classification", "global"),
});

export default ClassificationSection;
