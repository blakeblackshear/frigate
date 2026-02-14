import type { SectionConfigOverrides } from "./types";

const audio: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/audio_detectors",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "listen",
      "filters",
      "min_volume",
      "max_not_heard",
      "num_threads",
    ],
    fieldGroups: {
      detection: ["enabled", "listen", "filters"],
      sensitivity: ["min_volume", "max_not_heard"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["min_volume", "max_not_heard", "num_threads"],
    uiSchema: {
      listen: {
        "ui:widget": "audioLabels",
      },
    },
  },
  global: {
    restartRequired: [
      "enabled",
      "listen",
      "filters",
      "min_volume",
      "max_not_heard",
      "num_threads",
    ],
  },
  camera: {
    restartRequired: ["num_threads"],
  },
};

export default audio;
