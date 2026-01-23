// Motion Section Component
// Reusable for both global and camera-level motion settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the motion section
export const motionSectionConfig: SectionConfig = {
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
    sensitivity: ["threshold", "lightning_threshold", "contour_area"],
    algorithm: ["improve_contrast", "delta_alpha", "frame_alpha"],
  },
  hiddenFields: ["enabled_in_config"],
  advancedFields: [
    "lightning_threshold",
    "improve_contrast",
    "contour_area",
    "delta_alpha",
    "frame_alpha",
    "frame_height",
    "mqtt_off_delay",
  ],
};

export const MotionSection = createConfigSection({
  sectionPath: "motion",
  translationKey: "configForm.motion",
  defaultConfig: motionSectionConfig,
});

export default MotionSection;
