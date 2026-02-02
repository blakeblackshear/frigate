import type { SectionConfigOverrides } from "./types";

const detectors: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_detectors",
    restartRequired: [],
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
