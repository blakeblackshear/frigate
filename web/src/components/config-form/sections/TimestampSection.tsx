// Timestamp Section Component
// Reusable for both global and camera-level timestamp_style settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const TimestampSection = createConfigSection({
  sectionPath: "timestamp_style",
  defaultConfig: getSectionConfig("timestamp_style", "camera"),
});

export default TimestampSection;
