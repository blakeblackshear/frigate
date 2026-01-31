// Objects Section Component
// Reusable for both global and camera-level objects settings

import { createConfigSection } from "./BaseSection";

export const ObjectsSection = createConfigSection({
  sectionPath: "objects",
  defaultConfig: {
    fieldOrder: ["track", "alert", "detect", "filters"],
    fieldGroups: {
      tracking: ["track", "alert", "detect"],
      filtering: ["filters"],
    },
    hiddenFields: [
      "enabled_in_config",
      "mask",
      "raw_mask",
      "genai.enabled_in_config",
      "filters.*.mask",
      "filters.*.raw_mask",
    ],
    advancedFields: ["filters"],
    uiSchema: {
      "filters.*.min_area": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      "filters.*.max_area": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      track: {
        "ui:widget": "objectLabels",
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      genai: {
        objects: {
          "ui:widget": "objectLabels",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        required_zones: {
          "ui:widget": "zoneNames",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        enabled_in_config: {
          "ui:widget": "hidden",
        },
      },
    },
  },
});

export default ObjectsSection;
