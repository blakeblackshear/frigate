import type { SectionConfigOverrides } from "./types";

const record: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/record",
    messages: [
      {
        key: "no-record-role",
        health: (ctx) => ctx.fullCameraConfig?.record?.enabled === true,
        messageKey: "configMessages.record.noRecordRole",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          return !ctx.fullCameraConfig.ffmpeg?.inputs?.some((i) =>
            i.roles?.includes("record"),
          );
        },
      },
      {
        key: "no-record-sub-role",
        health: (ctx) => ctx.fullCameraConfig?.record?.sub?.enabled === true,
        messageKey: "configMessages.record.noRecordSubRole",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          const sub = ctx.formData?.sub as Record<string, unknown> | undefined;
          if (!sub?.enabled) return false;
          return !ctx.fullCameraConfig.ffmpeg?.inputs?.some((i) =>
            i.roles?.includes("record_sub"),
          );
        },
      },
    ],
    fieldDocs: {
      "alerts.pre_capture":
        "/configuration/record#pre-capture-and-post-capture",
      "alerts.post_capture":
        "/configuration/record#pre-capture-and-post-capture",
      "detections.pre_capture":
        "/configuration/record#pre-capture-and-post-capture",
      "detections.post_capture":
        "/configuration/record#pre-capture-and-post-capture",
    },
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "expire_interval",
      "continuous",
      "motion",
      "alerts",
      "detections",
      "sub",
      "preview",
      "export",
    ],
    fieldGroups: {
      retention: ["continuous", "motion"],
      events: ["alerts", "detections"],
    },
    hiddenFields: ["enabled_in_config", "sync_recordings"],
    advancedFields: ["expire_interval", "preview", "export"],
    uiSchema: {
      continuous: {
        "ui:options": { defaultOpen: true, disableCollapsible: true },
      },
      motion: {
        "ui:options": { defaultOpen: true, disableCollapsible: true },
      },
      export: {
        "ui:options": { defaultOpen: true, disableCollapsible: true },
        hwaccel_args: {
          "ui:widget": "FfmpegArgsWidget",
          "ui:options": {
            suppressMultiSchema: true,
            ffmpegPresetField: "hwaccel_args",
            ffmpegGlobalFieldPath: "export.hwaccel_args",
          },
        },
      },
      "alerts.retain.mode": {
        "ui:options": { enumI18nPrefix: "retainMode" },
      },
      "detections.retain.mode": {
        "ui:options": { enumI18nPrefix: "retainMode" },
      },
      "sub.alerts.mode": {
        "ui:options": { enumI18nPrefix: "retainMode" },
      },
      "sub.detections.mode": {
        "ui:options": { enumI18nPrefix: "retainMode" },
      },
      preview: {
        "ui:options": { defaultOpen: true, disableCollapsible: true },
        quality: {
          "ui:options": {
            enumI18nPrefix: "previewQuality",
          },
        },
      },
    },
  },
  global: {
    restartRequired: [],
  },
  camera: {
    restartRequired: [],
    hiddenFields: [
      "enabled_in_config",
      "sync_recordings",
      "export.max_concurrent",
    ],
  },
};

export default record;
