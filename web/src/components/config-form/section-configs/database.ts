import type { SectionConfigOverrides } from "./types";

const database: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced/system#database",
    restartRequired: ["path"],
    fieldOrder: ["path"],
    advancedFields: [],
    uiSchema: {
      path: {
        "ui:options": { size: "md" },
      },
    },
  },
};

export default database;
