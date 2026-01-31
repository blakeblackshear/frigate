// Review Section Component
// Reusable for both global and camera-level review settings

import { createConfigSection } from "./BaseSection";

export const ReviewSection = createConfigSection({
  sectionPath: "review",
  i18nNamespace: "config/global",
  defaultConfig: {
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
});

export default ReviewSection;
