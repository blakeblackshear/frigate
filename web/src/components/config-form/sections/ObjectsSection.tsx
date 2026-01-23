// Objects Section Component
// Reusable for both global and camera-level objects settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the objects section
export const objectsSectionConfig: SectionConfig = {
  fieldOrder: ["track", "alert", "detect", "filters", "mask"],
  fieldGroups: {
    tracking: ["track", "alert", "detect"],
    filtering: ["filters", "mask"],
  },
  hiddenFields: ["enabled_in_config"],
  advancedFields: ["filters", "mask"],
};

export const ObjectsSection = createConfigSection({
  sectionPath: "objects",
  translationKey: "configForm.objects",
  defaultConfig: objectsSectionConfig,
});

export default ObjectsSection;
