// Live Section Component
// Reusable for both global and camera-level live settings

import { createConfigSection } from "./BaseSection";

export const LiveSection = createConfigSection({
  sectionPath: "live",
  defaultConfig: {
    fieldOrder: ["stream_name", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["quality"],
  },
});

export default LiveSection;
