// Record Section Component
// Reusable for both global and camera-level record settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const RecordSection = createConfigSection({
  sectionPath: "record",
  defaultConfig: getSectionConfig("record", "camera"),
});

export default RecordSection;
