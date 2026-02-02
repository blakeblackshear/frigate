import type { SectionConfigOverrides } from "./types";

const detect: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/camera_specific",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "fps",
      "width",
      "height",
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
    fieldGroups: {
      resolution: ["enabled", "width", "height"],
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
