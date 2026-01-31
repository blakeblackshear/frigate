// Notifications Section Component
// Reusable for both global and camera-level notification settings

import { createConfigSection } from "./BaseSection";

export const NotificationsSection = createConfigSection({
  sectionPath: "notifications",
  defaultConfig: {
    fieldOrder: ["enabled", "email"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: [],
  },
});

export default NotificationsSection;
