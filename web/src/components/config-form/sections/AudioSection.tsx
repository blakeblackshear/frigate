// Audio Section Component
// Reusable for both global and camera-level audio settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const AudioSection = createConfigSection({
  sectionPath: "audio",
  defaultConfig: getSectionConfig("audio", "camera"),
});

export default AudioSection;
