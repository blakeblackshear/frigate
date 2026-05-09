import type { SectionConfigOverrides } from "./types";

const logger: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced#logger",
    restartRequired: ["default", "logs"],
    fieldOrder: ["default", "logs"],
    advancedFields: ["logs"],
    uiSchema: {
      default: {
        "ui:options": { enumI18nPrefix: "logger.logLevel" },
      },
    },
  },
};

export default logger;
