// Record Section Component
// Reusable for both global and camera-level record settings

import { createConfigSection } from "./BaseSection";

export const RecordSection = createConfigSection({
  sectionPath: "record",
  i18nNamespace: "config/record",
  defaultConfig: {
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
      retention: ["continuous", "motion"],
      events: ["alerts", "detections"],
    },
    hiddenFields: ["enabled_in_config", "sync_recordings"],
    advancedFields: ["expire_interval", "preview", "export"],
  },
});

export default RecordSection;
