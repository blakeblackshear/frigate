import type { SectionConfigOverrides } from "./types";

const genai: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/genai/config",
    restartRequired: [],
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
  },
};

export default genai;
