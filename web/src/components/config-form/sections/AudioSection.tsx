// Audio Section Component
// Reusable for both global and camera-level audio settings

import { createConfigSection } from "./BaseSection";

export const AudioSection = createConfigSection({
  sectionPath: "audio",
  i18nNamespace: "config/audio",
  defaultConfig: {
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
  },
});

export default AudioSection;
