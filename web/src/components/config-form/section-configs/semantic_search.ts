import type { SectionConfigOverrides } from "./types";

const semanticSearch: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/semantic_search",
    restartRequired: [],
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
    restartRequired: ["enabled", "model", "model_size", "device"],
    hiddenFields: ["reindex"],
    fieldMessages: [
      {
        key: "jinav2-small-model-size",
        health: (ctx) => ctx.fullConfig.semantic_search?.enabled === true,
        field: "model_size",
        messageKey: "configMessages.semanticSearch.jinav2SmallModelSize",
        severity: "warning",
        position: "after",
        condition: (ctx) =>
          ctx.formData?.model === "jinav2" &&
          ctx.formData?.model_size === "small",
      },
    ],
    uiSchema: {
      model: {
        "ui:widget": "semanticSearchModel",
      },
      model_size: {
        "ui:widget": "semanticSearchModelSize",
        "ui:options": { size: "xs", enumI18nPrefix: "modelSize" },
      },
    },
  },
};

export default semanticSearch;
