// Camera MQTT Section Component
// Camera-specific MQTT image publishing settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const CameraMqttSection = createConfigSection({
  sectionPath: "mqtt",
  defaultConfig: getSectionConfig("mqtt", "camera"),
});

export default CameraMqttSection;
