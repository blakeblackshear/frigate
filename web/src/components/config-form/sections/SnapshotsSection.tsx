// Snapshots Section Component
// Reusable for both global and camera-level snapshots settings

import { createConfigSection } from "./BaseSection";

export const SnapshotsSection = createConfigSection({
  sectionPath: "snapshots",
  i18nNamespace: "config/snapshots",
  defaultConfig: {
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
});

export default SnapshotsSection;
