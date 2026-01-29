// Timestamp Section Component
// Reusable for both global and camera-level timestamp_style settings

import { createConfigSection } from "./BaseSection";

export const TimestampSection = createConfigSection({
  sectionPath: "timestamp_style",
  i18nNamespace: "config/timestamp_style",
  defaultConfig: {
    fieldOrder: ["position", "format", "color", "thickness"],
    fieldGroups: {
      appearance: ["color", "thickness"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: [],
  },
});

export default TimestampSection;
