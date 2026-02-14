import type { SectionConfigOverrides } from "./types";

const objects: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_filters",
    fieldDocs: {
      "filters.min_area": "/configuration/object_filters#object-area",
      "filters.max_area": "/configuration/object_filters#object-area",
      "filters.min_score": "/configuration/object_filters#minimum-score",
      "filters.threshold": "/configuration/object_filters#threshold",
      "filters.min_ratio": "/configuration/object_filters/#object-proportions",
      "filters.max_ratio": "/configuration/object_filters/#object-proportions",
    },
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
    advancedFields: ["genai"],
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
          "ui:options": {
            size: "full",
          },
        },
        object_prompts: {
          additionalProperties: {
            "ui:options": {
              size: "full",
            },
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
  global: {
    restartRequired: ["track", "alert", "detect", "filters", "genai"],
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
  camera: {
    restartRequired: [],
  },
};

export default objects;
