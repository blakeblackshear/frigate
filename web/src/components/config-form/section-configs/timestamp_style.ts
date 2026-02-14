import type { SectionConfigOverrides } from "./types";

const timestampStyle: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [],
    fieldOrder: ["position", "format", "color", "thickness"],
    hiddenFields: ["effect", "enabled_in_config"],
    advancedFields: [],
    uiSchema: {
      position: {
        "ui:size": "xs",
      },
      format: {
        "ui:size": "xs",
      },
    },
  },
  global: {
    restartRequired: ["position", "format", "color", "thickness", "effect"],
  },
  camera: {
    restartRequired: [],
  },
};

export default timestampStyle;
