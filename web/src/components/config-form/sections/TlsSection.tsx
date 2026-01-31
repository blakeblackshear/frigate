// TLS Section Component
// Global TLS configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const TlsSection = createConfigSection({
  sectionPath: "tls",
  defaultConfig: getSectionConfig("tls", "global"),
});

export default TlsSection;
