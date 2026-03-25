import type { SectionConfigOverrides } from "./types";

const timestampStyle: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [],
    fieldOrder: ["position", "format", "thickness", "color"],
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
    restartRequired: [],
  },
  camera: {
    restartRequired: [],
  },
};

export default timestampStyle;
