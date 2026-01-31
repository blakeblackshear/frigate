// GenAI Section Component
// Global GenAI configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const GenaiSection = createConfigSection({
  sectionPath: "genai",
  defaultConfig: getSectionConfig("genai", "global"),
});

export default GenaiSection;
