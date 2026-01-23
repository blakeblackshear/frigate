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
      display: ["bounding_box", "crop", "quality", "timestamp"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["quality", "retain"],
  },
});

export default SnapshotsSection;
