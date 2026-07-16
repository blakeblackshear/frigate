import type { SectionConfigOverrides } from "./types";

const logger: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced/system#frigate-logger",
    restartRequired: ["default", "logs"],
    fieldOrder: ["default", "logs"],
    advancedFields: ["logs"],
    uiSchema: {
      default: {
        "ui:options": { enumI18nPrefix: "logger.logLevel" },
      },
      logs: {
        additionalProperties: {
          "ui:options": {
            enumI18nPrefix: "logger.logLevel",
            additionalPropertyKeyLabel:
              "configForm.additionalProperties.loggerNameLabel",
            additionalPropertyKeyPlaceholder:
              "configForm.additionalProperties.loggerNamePlaceholder",
          },
        },
      },
    },
  },
};

export default logger;
