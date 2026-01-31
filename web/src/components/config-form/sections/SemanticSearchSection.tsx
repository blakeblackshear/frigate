// Semantic Search Section Component
// Camera-level semantic search trigger settings

import { createConfigSection } from "./BaseSection";

export const SemanticSearchSection = createConfigSection({
  sectionPath: "semantic_search",
  defaultConfig: {
    fieldOrder: ["triggers"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: [],
  },
});

export default SemanticSearchSection;
