import type { SectionConfigOverrides } from "./types";

const record: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/record",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "expire_interval",
      "continuous",
      "motion",
      "alerts",
      "detections",
      "preview",
      "export",
    ],
    fieldGroups: {
      retention: ["enabled", "continuous", "motion"],
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
  },
};

export default record;
