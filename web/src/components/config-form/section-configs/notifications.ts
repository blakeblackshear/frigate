import type { SectionConfigOverrides } from "./types";

const notifications: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/notifications",
    restartRequired: [],
    fieldOrder: ["enabled", "email"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: [],
  },
  camera: {
    hiddenFields: ["enabled_in_config", "email"],
  },
};

export default notifications;
