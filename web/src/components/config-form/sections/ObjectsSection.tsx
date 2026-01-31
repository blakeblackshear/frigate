// Objects Section Component
// Reusable for both global and camera-level objects settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const ObjectsSection = createConfigSection({
  sectionPath: "objects",
  defaultConfig: getSectionConfig("objects", "camera"),
});

export default ObjectsSection;
