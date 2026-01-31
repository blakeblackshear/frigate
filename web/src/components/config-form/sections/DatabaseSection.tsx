// Database Section Component
// Global database configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const DatabaseSection = createConfigSection({
  sectionPath: "database",
  defaultConfig: getSectionConfig("database", "global"),
});

export default DatabaseSection;
