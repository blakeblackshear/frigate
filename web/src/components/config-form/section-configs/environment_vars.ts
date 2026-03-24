import type { SectionConfigOverrides } from "./types";

const environmentVars: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced#environment_vars",
    fieldOrder: [],
    advancedFields: [],
    uiSchema: {
      additionalProperties: {
        "ui:options": { size: "lg" },
      },
    },
  },
};

export default environmentVars;
