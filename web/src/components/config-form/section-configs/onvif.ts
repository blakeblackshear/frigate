import type { SectionConfigOverrides } from "./types";

const onvif: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/cameras#setting-up-camera-ptz-controls",
    fieldDocs: {
      autotracking: "/configuration/autotracking",
      "autotracking.calibrate_on_startup":
        "/configuration/autotracking#calibration",
    },
    fieldOrder: [
      "host",
      "port",
      "user",
      "password",
      "profile",
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
    restartRequired: ["autotracking.calibrate_on_startup"],
    uiSchema: {
      host: {
        "ui:options": { size: "sm" },
      },
      profile: {
        "ui:widget": "onvifProfile",
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
