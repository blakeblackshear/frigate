import type { SectionConfigOverrides } from "./types";

const review: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/review",
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
        },
        activity_context_prompt: {
          "ui:widget": "textarea",
        },
      },
    },
  },
};

export default review;
