// Environment Variables Section Component
// Global environment variables configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const EnvironmentVarsSection = createConfigSection({
  sectionPath: "environment_vars",
  defaultConfig: getSectionConfig("environment_vars", "global"),
});

export default EnvironmentVarsSection;
