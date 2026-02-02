import type { SectionConfigOverrides } from "./types";

const live: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/live",
    restartRequired: [],
    fieldOrder: ["stream_name", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["quality"],
  },
  global: {
    hiddenFields: ["streams"],
  },
};

export default live;
