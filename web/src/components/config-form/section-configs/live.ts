import type { SectionConfigOverrides } from "./types";

const live: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/live",
    restartRequired: [],
    fieldOrder: ["streams", "transcode", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality"],
  },
  global: {
    restartRequired: ["streams", "height", "quality"],
    hiddenFields: ["streams", "transcode"],
  },
  camera: {
    restartRequired: ["height", "quality"],
    orderedMaps: ["streams"],
    uiSchema: {
      streams: {
        "ui:field": "LiveStreamsField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
      transcode: {
        "ui:field": "LiveTranscodeField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
    },
  },
};

export default live;
