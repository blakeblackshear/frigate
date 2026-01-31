// Timestamp Section Component
// Reusable for both global and camera-level timestamp_style settings

import { createConfigSection } from "./BaseSection";

export const TimestampSection = createConfigSection({
  sectionPath: "timestamp_style",
  i18nNamespace: "config/global",
  defaultConfig: {
    fieldOrder: ["position", "format", "color", "thickness"],
    hiddenFields: ["effect", "enabled_in_config"],
    advancedFields: [],
  },
});

export default TimestampSection;
