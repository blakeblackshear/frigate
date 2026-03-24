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
  global: {
    uiSchema: {
      "ui:before": { render: "NotificationsSettingsExtras" },
      enabled: { "ui:widget": "hidden" },
      email: { "ui:widget": "hidden" },
      cooldown: { "ui:widget": "hidden" },
      enabled_in_config: { "ui:widget": "hidden" },
    },
  },
  camera: {
    hiddenFields: ["enabled_in_config", "email"],
  },
};

export default notifications;
