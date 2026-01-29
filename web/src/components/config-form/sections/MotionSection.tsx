// Motion Section Component
// Reusable for both global and camera-level motion settings

import { createConfigSection } from "./BaseSection";

export const MotionSection = createConfigSection({
  sectionPath: "motion",
  i18nNamespace: "config/motion",
  defaultConfig: {
    fieldOrder: [
      "enabled",
      "threshold",
      "lightning_threshold",
      "improve_contrast",
      "contour_area",
      "delta_alpha",
      "frame_alpha",
      "frame_height",
      "mask",
      "mqtt_off_delay",
    ],
    fieldGroups: {
      sensitivity: ["enabled", "threshold", "contour_area"],
      algorithm: ["improve_contrast", "delta_alpha", "frame_alpha"],
    },
    hiddenFields: ["enabled_in_config", "mask", "raw_mask"],
    advancedFields: [
      "lightning_threshold",
      "delta_alpha",
      "frame_alpha",
      "frame_height",
      "mqtt_off_delay",
    ],
  },
});

export default MotionSection;
