// Auth Section Component
// Global authentication configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const AuthSection = createConfigSection({
  sectionPath: "auth",
  defaultConfig: getSectionConfig("auth", "global"),
});

export default AuthSection;
