// Notifications Section Component
// Reusable for both global and camera-level notification settings

import { createConfigSection, type SectionConfig } from "./BaseSection";

// Configuration for the notifications section
export const notificationsSectionConfig: SectionConfig = {
  fieldOrder: ["enabled", "email"],
  fieldGroups: {},
  hiddenFields: ["enabled_in_config"],
  advancedFields: [],
};

export const NotificationsSection = createConfigSection({
  sectionPath: "notifications",
  translationKey: "configForm.notifications",
  defaultConfig: notificationsSectionConfig,
});

export default NotificationsSection;
