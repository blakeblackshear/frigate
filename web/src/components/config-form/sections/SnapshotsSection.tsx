// Snapshots Section Component
// Reusable for both global and camera-level snapshots settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the snapshots section
export const snapshotsSectionConfig: SectionConfig = {
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
};

export const SnapshotsSection = createConfigSection({
  sectionPath: "snapshots",
  translationKey: "configForm.snapshots",
  defaultConfig: snapshotsSectionConfig,
});

export default SnapshotsSection;
