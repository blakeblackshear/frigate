import type { SectionConfigOverrides } from "./types";

const audioTranscription: SectionConfigOverrides = {
  base: {
    fieldOrder: ["enabled", "language", "device", "model_size", "live_enabled"],
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["language", "device", "model_size"],
    overrideFields: ["enabled", "live_enabled"],
  },
  global: {
    fieldOrder: ["enabled", "language", "device", "model_size", "live_enabled"],
    advancedFields: ["language", "device", "model_size"],
  },
};

export default audioTranscription;
