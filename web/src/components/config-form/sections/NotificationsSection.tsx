// Notifications Section Component
// Reusable for both global and camera-level notification settings

import { createConfigSection } from "./BaseSection";
import { getSectionConfig } from "../sectionConfigs";

export const NotificationsSection = createConfigSection({
  sectionPath: "notifications",
  defaultConfig: getSectionConfig("notifications", "camera"),
});

export default NotificationsSection;
