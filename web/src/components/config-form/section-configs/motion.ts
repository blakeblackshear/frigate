import type { SectionConfigOverrides } from "./types";

const motion: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/motion_detection",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "threshold",
      "lightning_threshold",
      "skip_motion_threshold",
      "improve_contrast",
      "contour_area",
      "delta_alpha",
      "frame_alpha",
      "frame_height",
      "mqtt_off_delay",
    ],
    fieldGroups: {
      sensitivity: ["enabled", "threshold", "contour_area"],
      algorithm: ["improve_contrast", "delta_alpha", "frame_alpha"],
    },
    hiddenFields: ["enabled_in_config", "mask", "raw_mask"],
    advancedFields: [
      "lightning_threshold",
      "skip_motion_threshold",
      "delta_alpha",
      "frame_alpha",
      "frame_height",
      "mqtt_off_delay",
    ],
  },
  global: {
    restartRequired: ["frame_height"],
  },
  camera: {
    restartRequired: ["frame_height"],
  },
  replay: {
    restartRequired: [],
    fieldOrder: [
      "threshold",
      "contour_area",
      "lightning_threshold",
      "improve_contrast",
    ],
    fieldGroups: {
      sensitivity: ["threshold", "contour_area"],
      algorithm: ["improve_contrast"],
    },
    hiddenFields: [
      "enabled",
      "enabled_in_config",
      "mask",
      "raw_mask",
      "mqtt_off_delay",
      "delta_alpha",
      "frame_alpha",
      "frame_height",
    ],
    advancedFields: ["lightning_threshold"],
  },
};

export default motion;
