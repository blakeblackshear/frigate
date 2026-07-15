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
    fieldMessages: [
      {
        key: "autotracking-no-zones",
        field: "autotracking.required_zones",
        messageKey: "configMessages.onvif.autotrackingNoZones",
        severity: "error",
        position: "before",
        condition: (ctx) => {
          if (ctx.level !== "camera") return false;
          const zones = ctx.fullCameraConfig?.zones;
          return (
            !zones ||
            typeof zones !== "object" ||
            Object.keys(zones).length === 0
          );
        },
      },
    ],
    uiSchema: {
      host: {
        "ui:options": { size: "sm" },
      },
      password: {
        "ui:widget": "password",
      },
      profile: {
        "ui:widget": "onvifProfile",
      },
      autotracking: {
        required_zones: {
          "ui:widget": "zoneNames",
        },
        return_preset: {
          "ui:options": { size: "sm" },
          "ui:widget": "ptzPresets",
        },
        track: {
          "ui:widget": "objectLabels",
        },
        zooming: {
          "ui:options": {
            size: "xs",
            enumI18nPrefix: "onvif.autotracking.zooming",
          },
        },
      },
    },
  },
};

export default onvif;
