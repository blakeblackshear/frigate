// Birdseye Section Component
// Camera-level birdseye settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const BirdseyeSection = createConfigSection({
  sectionPath: "birdseye",
  defaultConfig: getSectionConfig("birdseye", "camera"),
});

export default BirdseyeSection;
