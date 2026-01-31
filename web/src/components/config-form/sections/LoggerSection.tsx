// Logger Section Component
// Global logger configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const LoggerSection = createConfigSection({
  sectionPath: "logger",
  defaultConfig: getSectionConfig("logger", "global"),
});

export default LoggerSection;
