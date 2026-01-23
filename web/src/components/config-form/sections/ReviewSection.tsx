// Review Section Component
// Reusable for both global and camera-level review settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the review section
export const reviewSectionConfig: SectionConfig = {
  fieldOrder: ["alerts", "detections"],
  fieldGroups: {},
  hiddenFields: ["enabled_in_config"],
  advancedFields: [],
};

export const ReviewSection = createConfigSection({
  sectionPath: "review",
  translationKey: "configForm.review",
  defaultConfig: reviewSectionConfig,
});

export default ReviewSection;
