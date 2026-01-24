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
      "alerts.required_zones",
      "detections.labels",
      "detections.required_zones",
    ],
    advancedFields: [],
  },
});

export default ReviewSection;
