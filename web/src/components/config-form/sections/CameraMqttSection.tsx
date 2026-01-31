// Camera MQTT Section Component
// Camera-specific MQTT image publishing settings

import { createConfigSection } from "./BaseSection";

export const CameraMqttSection = createConfigSection({
  sectionPath: "mqtt",
  defaultConfig: {
    fieldOrder: [
      "enabled",
      "timestamp",
      "bounding_box",
      "crop",
      "height",
      "required_zones",
      "quality",
    ],
    hiddenFields: [],
    advancedFields: ["height", "quality"],
    overrideFields: [],
    uiSchema: {
      required_zones: {
        "ui:widget": "zoneNames",
      },
    },
  },
});

export default CameraMqttSection;
