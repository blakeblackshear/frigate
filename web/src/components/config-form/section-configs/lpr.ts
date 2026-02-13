import type { SectionConfigOverrides } from "./types";

const lpr: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/license_plate_recognition",
    fieldDocs: {
      enhancement: "/configuration/license_plate_recognition#enhancement",
    },
    restartRequired: [],
    fieldOrder: ["enabled", "expire_time", "min_area", "enhancement"],
    hiddenFields: [],
    advancedFields: ["expire_time", "min_area", "enhancement"],
    overrideFields: ["enabled", "min_area", "enhancement"],
  },
  global: {
    fieldOrder: [
      "enabled",
      "model_size",
      "detection_threshold",
      "min_area",
      "recognition_threshold",
      "min_plate_length",
      "format",
      "match_distance",
      "known_plates",
      "enhancement",
      "debug_save_plates",
      "device",
      "replace_rules",
    ],
    advancedFields: [
      "detection_threshold",
      "recognition_threshold",
      "min_plate_length",
      "format",
      "match_distance",
      "known_plates",
      "enhancement",
      "debug_save_plates",
      "device",
      "replace_rules",
    ],
    restartRequired: [
      "enabled",
      "model_size",
      "detection_threshold",
      "min_area",
      "recognition_threshold",
      "min_plate_length",
      "format",
      "match_distance",
      "known_plates",
      "enhancement",
      "debug_save_plates",
      "device",
      "replace_rules",
    ],
    uiSchema: {
      format: {
        "ui:options": { size: "md" },
      },
      replace_rules: {
        "ui:field": "ReplaceRulesField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
    },
  },
};

export default lpr;
