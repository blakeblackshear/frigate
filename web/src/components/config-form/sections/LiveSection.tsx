// Live Section Component
// Reusable for both global and camera-level live settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the live section
export const liveSectionConfig: SectionConfig = {
  fieldOrder: ["stream_name", "height", "quality"],
  fieldGroups: {},
  hiddenFields: ["enabled_in_config"],
  advancedFields: ["quality"],
};

export const LiveSection = createConfigSection({
  sectionPath: "live",
  translationKey: "configForm.live",
  defaultConfig: liveSectionConfig,
});

export default LiveSection;
