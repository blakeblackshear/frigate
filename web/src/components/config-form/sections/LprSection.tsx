// License Plate Recognition Section Component
// Camera-level LPR settings

import { createConfigSection } from "./BaseSection";

export const LprSection = createConfigSection({
  sectionPath: "lpr",
  defaultConfig: {
    fieldOrder: ["enabled", "expire_time", "min_area", "enhancement"],
    hiddenFields: [],
    advancedFields: ["expire_time", "min_area", "enhancement"],
    overrideFields: ["enabled", "min_area", "enhancement"],
  },
});

export default LprSection;
