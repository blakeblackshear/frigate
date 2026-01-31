// ONVIF Section Component
// Camera-level ONVIF and autotracking settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const OnvifSection = createConfigSection({
  sectionPath: "onvif",
  defaultConfig: getSectionConfig("onvif", "camera"),
});

export default OnvifSection;
