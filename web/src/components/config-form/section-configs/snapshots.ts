import type { SectionConfigOverrides } from "./types";

const snapshots: SectionConfigOverrides = {
  base: {
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
    advancedFields: ["quality", "retain"],
    uiSchema: {
      required_zones: {
        "ui:widget": "zoneNames",
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
    },
  },
};

export default snapshots;
