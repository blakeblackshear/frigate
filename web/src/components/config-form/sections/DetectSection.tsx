// Detect Section Component
// Reusable for both global and camera-level detect settings

import { createConfigSection } from "./BaseSection";

export const DetectSection = createConfigSection({
  sectionPath: "detect",
  i18nNamespace: "config/detect",
  defaultConfig: {
    fieldOrder: [
      "enabled",
      "fps",
      "width",
      "height",
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
    fieldGroups: {
      resolution: ["width", "height"],
      tracking: ["min_initialized", "max_disappeared"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: [
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
  },
});

export default DetectSection;
