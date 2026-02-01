import type { SectionConfigOverrides } from "./types";

const notifications: SectionConfigOverrides = {
  base: {
    fieldOrder: ["enabled", "email"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: [],
  },
};

export default notifications;
