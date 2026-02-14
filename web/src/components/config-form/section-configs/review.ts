import type { SectionConfigOverrides } from "./types";

const review: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/review",
    restartRequired: [],
    fieldOrder: ["alerts", "detections", "genai"],
    fieldGroups: {},
    hiddenFields: [
      "enabled_in_config",
      "alerts.labels",
      "alerts.enabled_in_config",
      "detections.labels",
      "detections.enabled_in_config",
      "genai.enabled_in_config",
    ],
    advancedFields: [],
    uiSchema: {
      alerts: {
        "ui:before": { render: "CameraReviewStatusToggles" },
        required_zones: {
          "ui:widget": "hidden",
        },
      },
      detections: {
        required_zones: {
          "ui:widget": "hidden",
        },
      },
      genai: {
        additional_concerns: {
          "ui:widget": "textarea",
          "ui:options": {
            size: "full",
          },
        },
        activity_context_prompt: {
          "ui:widget": "textarea",
          "ui:options": {
            size: "full",
          },
        },
      },
    },
  },
  global: {
    restartRequired: ["alerts", "detections", "genai"],
  },
  camera: {
    restartRequired: [],
  },
};

export default review;
