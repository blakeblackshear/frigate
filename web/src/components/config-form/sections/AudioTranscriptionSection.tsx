// Audio Transcription Section Component
// Global and camera-level audio transcription settings

import { createConfigSection } from "./BaseSection";

export const AudioTranscriptionSection = createConfigSection({
  sectionPath: "audio_transcription",
  i18nNamespace: "config/audio_transcription",
  defaultConfig: {
    fieldOrder: ["enabled", "language", "device", "model_size", "live_enabled"],
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["language", "device", "model_size"],
    overrideFields: ["enabled", "live_enabled"],
  },
});

export default AudioTranscriptionSection;
