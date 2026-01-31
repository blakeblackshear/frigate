// Telemetry Section Component
// Global telemetry configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const TelemetrySection = createConfigSection({
  sectionPath: "telemetry",
  defaultConfig: getSectionConfig("telemetry", "global"),
});

export default TelemetrySection;
