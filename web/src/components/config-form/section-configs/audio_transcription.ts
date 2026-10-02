import type { SectionConfigOverrides } from "./types";

const audioTranscription: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/audio_detectors#audio-transcription",
    messages: [
      {
        key: "audio-detection-disabled",
        health: (ctx) =>
          ctx.fullCameraConfig?.audio_transcription?.enabled === true,
        messageKey: "configMessages.audioTranscription.audioDetectionDisabled",
        runtimeOverride: {
          section: "audio",
          messageKey:
            "configMessages.audioTranscription.audioDetectionRuntimeDisabled",
        },
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level === "camera" && ctx.fullCameraConfig) {
            return (
              !ctx.fullCameraConfig.ffmpeg?.inputs?.some((input) =>
                input.roles?.includes("audio"),
              ) || ctx.fullCameraConfig.audio.enabled === false
            );
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
    uiSchema: {
      model_size: {
        "ui:options": { size: "xs", enumI18nPrefix: "modelSize" },
      },
    },
  },
  global: {
    fieldOrder: ["enabled", "model", "language", "device", "model_size"],
    advancedFields: ["language", "device", "model_size"],
    restartRequired: ["enabled", "model", "language", "device", "model_size"],
    fieldMessages: [
      {
        key: "genai-provider-ignores-local-settings",
        field: "device",
        messageKey: "configMessages.audioTranscription.genaiProviderSelected",
        severity: "info",
        position: "after",
        condition: (ctx) =>
          typeof ctx.formData?.model === "string" &&
          ctx.formData.model !== "" &&
          ctx.formData.model !== "whisper",
      },
    ],
    uiSchema: {
      model: {
        "ui:widget": "audioTranscriptionModel",
      },
      model_size: {
        "ui:widget": "audioTranscriptionModelSize",
        "ui:options": { size: "xs", enumI18nPrefix: "modelSize" },
      },
    },
  },
};

export default audioTranscription;
