import type { SectionConfigOverrides } from "./types";

const timestampStyle: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [],
    fieldOrder: ["position", "format", "color", "thickness"],
    hiddenFields: ["effect", "enabled_in_config"],
    advancedFields: [],
  },
};

export default timestampStyle;
