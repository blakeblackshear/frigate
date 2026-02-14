import type { SectionConfigOverrides } from "./types";

const onvif: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/cameras#setting-up-camera-ptz-controls",
    restartRequired: [
      "host",
      "port",
      "user",
      "password",
      "tls_insecure",
      "ignore_time_mismatch",
      "autotracking.calibrate_on_startup",
    ],
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
      host: {
        "ui:options": { size: "sm" },
      },
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
