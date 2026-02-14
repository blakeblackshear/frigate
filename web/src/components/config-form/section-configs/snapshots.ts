import type { SectionConfigOverrides } from "./types";

const snapshots: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/snapshots",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "bounding_box",
      "crop",
      "quality",
      "timestamp",
      "retain",
    ],
    fieldGroups: {
      display: ["enabled", "bounding_box", "crop", "quality", "timestamp"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality", "retain"],
    uiSchema: {
      required_zones: {
        "ui:widget": "zoneNames",
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
    },
  },
  global: {
    restartRequired: [
      "enabled",
      "bounding_box",
      "crop",
      "quality",
      "timestamp",
      "retain",
    ],
    hiddenFields: ["enabled_in_config", "required_zones"],
  },
  camera: {
    restartRequired: [],
  },
};

export default snapshots;
