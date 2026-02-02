import type { SectionConfigOverrides } from "./types";

const objects: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_filters",
    restartRequired: [],
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
      "filters.mask",
      "filters.raw_mask",
    ],
    advancedFields: ["filters"],
    uiSchema: {
      "filters.*.min_area": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      "filters.*": {
        "ui:options": {
          additionalPropertyKeyReadonly: true,
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
        prompt: {
          "ui:widget": "textarea",
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
  global: {
    hiddenFields: [
      "enabled_in_config",
      "mask",
      "raw_mask",
      "genai.enabled_in_config",
      "filters.*.mask",
      "filters.*.raw_mask",
      "filters.mask",
      "filters.raw_mask",
      "genai.required_zones",
    ],
  },
};

export default objects;
