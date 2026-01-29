// ONVIF Section Component
// Camera-level ONVIF and autotracking settings

import { createConfigSection } from "./BaseSection";

export const OnvifSection = createConfigSection({
  sectionPath: "onvif",
  i18nNamespace: "config/onvif",
  defaultConfig: {
    fieldOrder: [
      "host",
      "port",
      "user",
      "password",
      "tls_insecure",
      "ignore_time_mismatch",
      "autotracking",
    ],
    hiddenFields: [
      "autotracking.enabled_in_config",
      "autotracking.movement_weights",
    ],
    advancedFields: ["tls_insecure", "ignore_time_mismatch"],
    overrideFields: [],
    uiSchema: {
      autotracking: {
        required_zones: {
          "ui:widget": "zoneNames",
        },
        track: {
          "ui:widget": "objectLabels",
        },
      },
    },
  },
});

export default OnvifSection;
