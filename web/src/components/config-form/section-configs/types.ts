import type { FrigateConfig, CameraConfig } from "@/types/frigateConfig";
import type { ConfigSectionData } from "@/types/configForm";
import type { SectionConfig } from "../sections/BaseSection";

/** Context provided to message condition functions */
export type MessageConditionContext = {
  fullConfig: FrigateConfig;
  fullCameraConfig?: CameraConfig;
  level: "global" | "camera";
  cameraName?: string;
  formData: ConfigSectionData;
};

/** Severity levels for conditional messages */
export type MessageSeverity = "info" | "warning" | "error";

/** A conditional message definition */
export type ConditionalMessage = {
  /** Unique key for React list rendering and deduplication */
  key: string;
  /** Translation key resolved via t() in the views/settings namespace */
  messageKey: string;
  /** Severity level controlling visual styling */
  severity: MessageSeverity;
  /** Function returning true when the message should be shown */
  condition: (ctx: MessageConditionContext) => boolean;
};

/** Field-level conditional message, adds field targeting */
export type FieldConditionalMessage = ConditionalMessage & {
  /** Dot-separated field path (e.g., "enabled", "alerts.labels") */
  field: string;
  /** Whether to render before or after the field (default: "before") */
  position?: "before" | "after";
};

export type SectionConfigOverrides = {
  base?: SectionConfig;
  global?: Partial<SectionConfig>;
  camera?: Partial<SectionConfig>;
  replay?: Partial<SectionConfig>;
};
