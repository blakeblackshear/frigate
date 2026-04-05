import type { SectionConfigOverrides } from "./types";

const audioTranscription: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/audio_detectors#audio-transcription",
    messages: [
      {
        key: "audio-detection-disabled",
        messageKey: "configMessages.audioTranscription.audioDetectionDisabled",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level === "camera" && ctx.fullCameraConfig) {
            return ctx.fullCameraConfig.audio.enabled === false;
          }
          return false;
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["enabled", "language", "device", "model_size"],
    hiddenFields: ["enabled_in_config", "live_enabled"],
    advancedFields: ["language", "device", "model_size"],
    overrideFields: ["enabled", "live_enabled"],
  },
  global: {
    fieldOrder: ["enabled", "language", "device", "model_size"],
    advancedFields: ["language", "device", "model_size"],
    restartRequired: ["enabled", "language", "device", "model_size"],
  },
};

export default audioTranscription;
