// FFmpeg Section Component
// Global and camera-level FFmpeg settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const FfmpegSection = createConfigSection({
  sectionPath: "ffmpeg",
  defaultConfig: getSectionConfig("ffmpeg", "camera"),
});

export default FfmpegSection;
