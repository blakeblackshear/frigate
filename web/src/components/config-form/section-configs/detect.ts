import type { SectionConfigOverrides } from "./types";

const detect: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/camera_specific",
    fieldOrder: [
      "enabled",
      "width",
      "height",
      "fps",
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
      "interval",
      "threshold",
      "max_frames",
    ],
    restartRequired: [
      "width",
      "height",
      "fps",
      "min_initialized",
      "max_disappeared",
      "stationary",
    ],
    fieldGroups: {
      resolution: ["enabled", "width", "height", "fps"],
      tracking: ["min_initialized", "max_disappeared"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: [
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
  },
};

export default detect;
