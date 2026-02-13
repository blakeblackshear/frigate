import type { SectionConfigOverrides } from "./types";

const semanticSearch: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/semantic_search",
    restartRequired: [],
    fieldOrder: ["triggers"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: [],
    uiSchema: {
      enabled: {
        "ui:after": { render: "SemanticSearchReindex" },
      },
    },
  },
  global: {
    fieldOrder: ["enabled", "reindex", "model", "model_size", "device"],
    advancedFields: ["reindex", "device"],
    restartRequired: ["enabled", "reindex", "model", "model_size", "device"],
  },
};

export default semanticSearch;
