import type { SectionConfigOverrides } from "./types";

const onvif: SectionConfigOverrides = {
  base: {
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
};

export default onvif;
