// MQTT Section Component
// Global MQTT configuration settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const MqttSection = createConfigSection({
  sectionPath: "mqtt",
  defaultConfig: getSectionConfig("mqtt", "global"),
});

export default MqttSection;
