// Snapshots Section Component
// Reusable for both global and camera-level snapshots settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const SnapshotsSection = createConfigSection({
  sectionPath: "snapshots",
  defaultConfig: getSectionConfig("snapshots", "camera"),
});

export default SnapshotsSection;
