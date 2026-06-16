import type { SectionConfigOverrides } from "./types";

const snapshots: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/snapshots",
    messages: [
      {
        key: "detect-disabled",
        messageKey: "configMessages.snapshots.detectDisabled",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          return ctx.fullCameraConfig.detect?.enabled === false;
        },
      },
    ],
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "bounding_box",
      "crop",
      "quality",
      "timestamp",
      "required_zones",
      "retain",
    ],
    fieldGroups: {
      display: ["bounding_box", "crop", "quality", "timestamp"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality"],
    uiSchema: {
      required_zones: {
        "ui:widget": "zoneNames",
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      "retain.mode": {
        "ui:options": {
          enumI18nPrefix: "retainMode",
        },
      },
    },
  },
  global: {
    restartRequired: [],
    hiddenFields: ["enabled_in_config", "required_zones"],
  },
  camera: {
    restartRequired: [],
  },
};

export default snapshots;
