import type { SectionConfigOverrides } from "./types";

const ui: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [],
    fieldOrder: ["dashboard", "order"],
    hiddenFields: ["order"],
    advancedFields: [],
    overrideFields: [],
  },
  global: {
    fieldOrder: ["timezone", "time_format", "unit_system"],
    advancedFields: [],
    restartRequired: ["unit_system"],
    uiSchema: {
      timezone: {
        "ui:widget": "timezoneSelect",
      },
      time_format: {
        "ui:options": { enumI18nPrefix: "ui.timeFormat" },
      },
      unit_system: {
        "ui:options": { enumI18nPrefix: "ui.unitSystem" },
      },
    },
  },
};

export default ui;
