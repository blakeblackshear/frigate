// Live Section Component
// Reusable for both global and camera-level live settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const LiveSection = createConfigSection({
  sectionPath: "live",
  defaultConfig: getSectionConfig("live", "camera"),
});

export default LiveSection;
