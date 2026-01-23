// Timestamp Section Component
// Reusable for both global and camera-level timestamp_style settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the timestamp_style section
export const timestampSectionConfig: SectionConfig = {
  fieldOrder: ["position", "format", "color", "thickness", "effect"],
  fieldGroups: {
    appearance: ["color", "thickness", "effect"],
  },
  hiddenFields: ["enabled_in_config"],
  advancedFields: ["thickness", "effect"],
};

export const TimestampSection = createConfigSection({
  sectionPath: "timestamp_style",
  translationKey: "configForm.timestampStyle",
  defaultConfig: timestampSectionConfig,
});

export default TimestampSection;
