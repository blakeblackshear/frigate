import type { SectionConfigOverrides } from "./types";

const database: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced#database",
    restartRequired: [],
    fieldOrder: ["path"],
    advancedFields: [],
  },
};

export default database;
