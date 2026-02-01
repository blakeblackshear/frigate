import type { SectionConfigOverrides } from "./types";

const ui: SectionConfigOverrides = {
  base: {
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
  },
};

export default ui;
