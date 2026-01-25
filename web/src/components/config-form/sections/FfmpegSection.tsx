// FFmpeg Section Component
// Global and camera-level FFmpeg settings

import { createConfigSection } from "./BaseSection";

export const FfmpegSection = createConfigSection({
  sectionPath: "ffmpeg",
  i18nNamespace: "config/ffmpeg",
  defaultConfig: {
    fieldOrder: [
      "inputs",
      "path",
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    hiddenFields: [],
    advancedFields: [
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    overrideFields: [
      "path",
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
  },
});

export default FfmpegSection;
