import type { SectionConfigOverrides } from "./types";

const audio: SectionConfigOverrides = {
  base: {
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
};

export default audio;
