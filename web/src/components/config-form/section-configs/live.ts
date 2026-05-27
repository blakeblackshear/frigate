import type { SectionConfigOverrides } from "./types";

const live: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/live",
    restartRequired: [],
    fieldOrder: ["streams", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality"],
  },
  global: {
    restartRequired: ["streams", "height", "quality"],
    hiddenFields: ["streams"],
  },
  camera: {
    restartRequired: ["height", "quality"],
    uiSchema: {
      streams: {
        "ui:field": "LiveStreamsField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
    },
  },
};

export default live;
