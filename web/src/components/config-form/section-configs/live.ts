import type { SectionConfigOverrides } from "./types";

const live: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/live",
    restartRequired: [],
    fieldOrder: ["stream_name", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality"],
  },
  global: {
    restartRequired: ["stream_name", "height", "quality"],
    hiddenFields: ["streams"],
  },
  camera: {
    restartRequired: ["height", "quality"],
  },
};

export default live;
