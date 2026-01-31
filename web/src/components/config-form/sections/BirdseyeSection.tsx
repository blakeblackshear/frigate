// Birdseye Section Component
// Camera-level birdseye settings

import { createConfigSection } from "./BaseSection";

export const BirdseyeSection = createConfigSection({
  sectionPath: "birdseye",
  i18nNamespace: "config/global",
  defaultConfig: {
    fieldOrder: ["enabled", "mode", "order"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: ["enabled", "mode"],
  },
});

export default BirdseyeSection;
