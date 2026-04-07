import type { SectionConfigOverrides } from "./types";

const lpr: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/license_plate_recognition",
    messages: [
      {
        key: "global-disabled",
        messageKey: "configMessages.lpr.globalDisabled",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level !== "camera") return false;
          return ctx.fullConfig.lpr?.enabled === false;
        },
      },
      {
        key: "vehicle-not-tracked",
        messageKey: "configMessages.lpr.vehicleNotTracked",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          if (ctx.fullCameraConfig.type === "lpr") return false;
          const tracked = ctx.fullCameraConfig.objects?.track ?? [];
          return !tracked.some((o) => ["car", "motorcycle"].includes(o));
        },
      },
    ],
    fieldDocs: {
      enhancement: "/configuration/license_plate_recognition#enhancement",
    },
    restartRequired: [],
    fieldOrder: ["enabled", "min_area", "enhancement", "expire_time"],
    hiddenFields: [],
    advancedFields: ["expire_time", "enhancement"],
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
    restartRequired: ["model_size", "enhancement", "device"],
    uiSchema: {
      format: {
        "ui:options": { size: "md" },
      },
      known_plates: {
        "ui:field": "KnownPlatesField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
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
