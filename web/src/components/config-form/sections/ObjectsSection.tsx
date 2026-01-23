// Objects Section Component
// Reusable for both global and camera-level objects settings

import { createConfigSection } from "./BaseSection";

export const ObjectsSection = createConfigSection({
  sectionPath: "objects",
  i18nNamespace: "config/objects",
  defaultConfig: {
    fieldOrder: ["track", "alert", "detect", "filters", "mask"],
    fieldGroups: {
      tracking: ["track", "alert", "detect"],
      filtering: ["filters", "mask"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["filters", "mask"],
  },
});

export default ObjectsSection;
