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
      "autotracking",
      "ignore_time_mismatch",
    ],
    hiddenFields: ["autotracking.enabled_in_config"],
    advancedFields: ["tls_insecure", "autotracking", "ignore_time_mismatch"],
    overrideFields: [],
  },
});

export default OnvifSection;
