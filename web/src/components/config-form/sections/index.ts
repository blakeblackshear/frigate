// Config Form Section Components
// Reusable components for both global and camera-level settings

export {
  createConfigSection,
  type BaseSectionProps,
  type SectionConfig,
  type CreateSectionOptions,
} from "./BaseSection";

export { DetectSection, detectSectionConfig } from "./DetectSection";
export { RecordSection, recordSectionConfig } from "./RecordSection";
export { SnapshotsSection, snapshotsSectionConfig } from "./SnapshotsSection";
export { MotionSection, motionSectionConfig } from "./MotionSection";
export { ObjectsSection, objectsSectionConfig } from "./ObjectsSection";
export { ReviewSection, reviewSectionConfig } from "./ReviewSection";
export { AudioSection, audioSectionConfig } from "./AudioSection";
export {
  NotificationsSection,
  notificationsSectionConfig,
} from "./NotificationsSection";
export { LiveSection, liveSectionConfig } from "./LiveSection";
export { TimestampSection, timestampSectionConfig } from "./TimestampSection";
