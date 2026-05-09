import type { SectionConfigOverrides } from "./types";

const ui: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [],
    fieldOrder: ["dashboard", "order"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: [],
  },
  global: {
    fieldOrder: [
      "timezone",
      "time_format",
      "date_style",
      "time_style",
      "unit_system",
    ],
    advancedFields: [],
    restartRequired: ["unit_system"],
    uiSchema: {
      timezone: {
        "ui:widget": "timezoneSelect",
      },
      time_format: {
        "ui:options": { enumI18nPrefix: "ui.timeFormat" },
      },
      date_style: {
        "ui:options": { enumI18nPrefix: "ui.TimeOrDateStyle" },
      },
      time_style: {
        "ui:options": { enumI18nPrefix: "ui.TimeOrDateStyle" },
      },
      unit_system: {
        "ui:options": { enumI18nPrefix: "ui.unitSystem" },
      },
    },
  },
};

export default ui;
