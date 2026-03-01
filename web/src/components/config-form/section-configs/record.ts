import type { SectionConfigOverrides } from "./types";

const record: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/record",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "retain_policy",
      "expire_interval",
      "continuous",
      "motion",
      "alerts",
      "detections",
      "preview",
      "export",
    ],
    fieldGroups: {
      retention: ["enabled", "retain_policy", "continuous", "motion"],
      events: ["alerts", "detections"],
    },
    hiddenFields: ["enabled_in_config", "sync_recordings"],
    advancedFields: ["expire_interval", "preview", "export"],
    uiSchema: {
      export: {
        hwaccel_args: {
          "ui:options": { size: "lg" },
        },
      },
    },
  },
  global: {
    restartRequired: [
      "enabled",
      "retain_policy",
      "expire_interval",
      "continuous",
      "motion",
      "alerts",
      "detections",
      "preview",
      "export",
    ],
  },
  camera: {
    restartRequired: [],
    hiddenFields: ["retain_policy"],
  },
};

export default record;
