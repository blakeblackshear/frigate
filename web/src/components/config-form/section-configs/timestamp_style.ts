import type { SectionConfigOverrides } from "./types";

const timestampStyle: SectionConfigOverrides = {
  base: {
    fieldOrder: ["position", "format", "color", "thickness"],
    hiddenFields: ["effect", "enabled_in_config"],
    advancedFields: [],
  },
};

export default timestampStyle;
