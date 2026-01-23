// Audio Section Component
// Reusable for both global and camera-level audio settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the audio section
export const audioSectionConfig: SectionConfig = {
  fieldOrder: [
    "enabled",
    "listen",
    "filters",
    "min_volume",
    "max_not_heard",
    "num_threads",
  ],
  fieldGroups: {
    detection: ["listen", "filters"],
    sensitivity: ["min_volume", "max_not_heard"],
  },
  hiddenFields: ["enabled_in_config"],
  advancedFields: ["min_volume", "max_not_heard", "num_threads"],
};

export const AudioSection = createConfigSection({
  sectionPath: "audio",
  translationKey: "configForm.audio",
  defaultConfig: audioSectionConfig,
});

export default AudioSection;
