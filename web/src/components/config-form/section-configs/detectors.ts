import type { SectionConfigOverrides } from "./types";

const detectors: SectionConfigOverrides = {
  base: {
    fieldOrder: [],
    advancedFields: [],
    hiddenFields: [
      "*.model.labelmap",
      "*.model.attributes_map",
      "*.model",
      "*.model_path",
    ],
  },
};

export default detectors;
