import type { SectionConfigOverrides } from "./types";

const logger: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced#logger",
    restartRequired: ["default", "logs"],
    fieldOrder: ["default", "logs"],
    advancedFields: ["logs"],
  },
};

export default logger;
