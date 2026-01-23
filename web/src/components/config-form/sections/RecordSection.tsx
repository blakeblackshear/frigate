// Record Section Component
// Reusable for both global and camera-level record settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the record section
export const recordSectionConfig: SectionConfig = {
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
  hiddenFields: ["enabled_in_config"],
  advancedFields: ["expire_interval", "preview", "export"],
};

export const RecordSection = createConfigSection({
  sectionPath: "record",
  translationKey: "configForm.record",
  defaultConfig: recordSectionConfig,
});

export default RecordSection;
