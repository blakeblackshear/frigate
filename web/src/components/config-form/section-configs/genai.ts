import type { SectionConfigOverrides } from "./types";

const genai: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/genai/config",
    advancedFields: ["*.base_url", "*.provider_options", "*.runtime_options"],
    hiddenFields: ["genai.enabled_in_config"],
    uiSchema: {
      "ui:options": { disableNestedCard: true },
      "*": {
        "ui:options": { disableNestedCard: true },
        "ui:order": [
          "provider",
          "api_key",
          "base_url",
          "model",
          "provider_options",
          "runtime_options",
          "*",
        ],
      },
      "*.roles": {
        "ui:widget": "genaiRoles",
      },
      "*.api_key": {
        "ui:options": { size: "lg" },
      },
      "*.base_url": {
        "ui:options": { size: "lg" },
      },
      "*.model": {
        "ui:widget": "genaiModel",
        "ui:options": { size: "xs" },
      },
      "*.provider": {
        "ui:options": { size: "xs" },
      },
      "*.provider_options": {
        additionalProperties: {
          "ui:options": { size: "lg" },
        },
      },
      "*.runtime_options": {
        additionalProperties: {
          "ui:options": { size: "lg" },
        },
      },
    },
  },
};

export default genai;
