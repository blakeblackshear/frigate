// Detect Section Component
// Reusable for both global and camera-level detect settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the detect section
export const detectSectionConfig: SectionConfig = {
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
};

export const DetectSection = createConfigSection({
  sectionPath: "detect",
  translationKey: "configForm.detect",
  defaultConfig: detectSectionConfig,
});

export default DetectSection;
