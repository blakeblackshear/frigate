// Timestamp Section Component
// Reusable for both global and camera-level timestamp_style settings

import { createConfigSection } from "./BaseSection";

export const TimestampSection = createConfigSection({
  sectionPath: "timestamp_style",
  i18nNamespace: "config/timestamp_style",
  defaultConfig: {
    fieldOrder: ["position", "format", "color", "thickness", "effect"],
    fieldGroups: {
      appearance: ["color", "thickness", "effect"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["thickness", "effect"],
  },
});

export default TimestampSection;
