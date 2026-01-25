// Camera UI Section Component
// Camera UI display settings

import { createConfigSection } from "./BaseSection";

export const CameraUiSection = createConfigSection({
  sectionPath: "ui",
  i18nNamespace: "config/camera_ui",
  defaultConfig: {
    fieldOrder: ["dashboard", "order"],
    hiddenFields: [],
    advancedFields: [],
    overrideFields: [],
  },
});

export default CameraUiSection;
