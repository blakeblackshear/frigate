// Review Section Component
// Reusable for both global and camera-level review settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const ReviewSection = createConfigSection({
  sectionPath: "review",
  defaultConfig: getSectionConfig("review", "camera"),
});

export default ReviewSection;
