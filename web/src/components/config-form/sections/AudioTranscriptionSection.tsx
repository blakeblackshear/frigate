// Audio Transcription Section Component
// Global and camera-level audio transcription settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const AudioTranscriptionSection = createConfigSection({
  sectionPath: "audio_transcription",
  defaultConfig: getSectionConfig("audio_transcription", "camera"),
});

export default AudioTranscriptionSection;
