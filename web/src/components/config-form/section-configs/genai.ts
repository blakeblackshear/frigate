import type { SectionConfigOverrides } from "./types";

const genai: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/genai/config",
    restartRequired: [
      "provider",
      "api_key",
      "base_url",
      "model",
      "provider_options",
      "runtime_options",
    ],
    fieldOrder: [
      "provider",
      "api_key",
      "base_url",
      "model",
      "provider_options",
      "runtime_options",
    ],
    advancedFields: ["base_url", "provider_options", "runtime_options"],
    hiddenFields: ["genai.enabled_in_config"],
    uiSchema: {
      api_key: {
        "ui:options": { size: "md" },
      },
      base_url: {
        "ui:options": { size: "lg" },
      },
      model: {
        "ui:options": { size: "md" },
      },
      provider_options: {
        additionalProperties: {
          "ui:options": { size: "lg" },
        },
      },
      runtime_options: {
        additionalProperties: {
          "ui:options": { size: "lg" },
        },
      },
    },
  },
};

export default genai;
