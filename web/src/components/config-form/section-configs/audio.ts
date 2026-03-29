import type { SectionConfigOverrides } from "./types";

const audio: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/audio_detectors",
    messages: [
      {
        key: "no-audio-role",
        messageKey: "configMessages.audio.noAudioRole",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level === "camera" && ctx.fullCameraConfig) {
            return !ctx.fullCameraConfig.ffmpeg?.inputs?.some((input) =>
              input.roles?.includes("audio"),
            );
          }
          return false;
        },
      },
    ],
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
      detection: ["listen", "filters"],
      sensitivity: ["min_volume", "max_not_heard"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["min_volume", "max_not_heard", "num_threads"],
    uiSchema: {
      filters: {
        "ui:options": {
          expandable: false,
        },
      },
      "filters.*": {
        "ui:options": {
          additionalPropertyKeyReadonly: true,
        },
      },
      listen: {
        "ui:widget": "audioLabels",
      },
    },
  },
  global: {
    restartRequired: ["num_threads"],
  },
  camera: {
    restartRequired: ["num_threads"],
  },
};

export default audio;
