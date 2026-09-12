import type { SectionConfigOverrides } from "./types";

const classification: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/custom_classification/object_classification",
    restartRequired: ["bird.enabled"],
    hiddenFields: ["custom"],
    advancedFields: [],
  },
};

export default classification;
