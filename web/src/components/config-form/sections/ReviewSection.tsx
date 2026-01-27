// Review Section Component
// Reusable for both global and camera-level review settings

import { createConfigSection } from "./BaseSection";

export const ReviewSection = createConfigSection({
  sectionPath: "review",
  i18nNamespace: "config/review",
  defaultConfig: {
    fieldOrder: ["alerts", "detections"],
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
  },
});

export default ReviewSection;
