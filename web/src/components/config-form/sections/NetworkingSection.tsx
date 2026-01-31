// Networking Section Component
// Global networking configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const NetworkingSection = createConfigSection({
  sectionPath: "networking",
  defaultConfig: getSectionConfig("networking", "global"),
});

export default NetworkingSection;
