import type { SectionConfigOverrides } from "./types";

const classification: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/custom_classification/object_classification",
    restartRequired: ["bird.enabled", "bird.threshold"],
    hiddenFields: ["custom"],
    advancedFields: [],
  },
};

export default classification;
