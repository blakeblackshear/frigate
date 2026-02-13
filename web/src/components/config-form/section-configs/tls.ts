import type { SectionConfigOverrides } from "./types";

const tls: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/tls",
    restartRequired: ["enabled"],
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
    uiSchema: {
      cert: {
        "ui:options": { size: "md" },
      },
      key: {
        "ui:options": { size: "md" },
      },
    },
  },
};

export default tls;
