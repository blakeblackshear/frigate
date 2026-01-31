// Proxy Section Component
// Global proxy configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const ProxySection = createConfigSection({
  sectionPath: "proxy",
  defaultConfig: getSectionConfig("proxy", "global"),
});

export default ProxySection;
