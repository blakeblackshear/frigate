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
      "alerts.required_zones",
      "detections.labels",
      "detections.enabled_in_config",
      "detections.required_zones",
      "genai.enabled_in_config",
    ],
    advancedFields: [],
    uiSchema: {
      alerts: {
        "ui:before": { render: "CameraReviewSettingsView" },
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
