// Model Section Component
// Global model configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const ModelSection = createConfigSection({
  sectionPath: "model",
  defaultConfig: getSectionConfig("model", "global"),
});

export default ModelSection;
