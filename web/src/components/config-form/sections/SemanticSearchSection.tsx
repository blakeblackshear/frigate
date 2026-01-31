// Semantic Search Section Component
// Camera-level semantic search trigger settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const SemanticSearchSection = createConfigSection({
  sectionPath: "semantic_search",
  defaultConfig: getSectionConfig("semantic_search", "camera"),
});

export default SemanticSearchSection;
