// UI Section Component
// Global UI configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const UiSection = createConfigSection({
  sectionPath: "ui",
  defaultConfig: getSectionConfig("ui", "global"),
});

export default UiSection;
