import type { SectionConfigOverrides } from "./types";

const semanticSearch: SectionConfigOverrides = {
  base: {
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
  },
};

export default semanticSearch;
