import type { SectionConfigOverrides } from "./types";

const review: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/review",
    messages: [
      {
        key: "record-disabled",
        messageKey: "configMessages.review.recordDisabled",
        severity: "warning",
        condition: (ctx) => {
          if (ctx.level === "camera" && ctx.fullCameraConfig) {
            return ctx.fullCameraConfig.record.enabled === false;
          }
          return ctx.fullConfig.record?.enabled === false;
        },
      },
      {
        key: "detect-disabled",
        messageKey: "configMessages.review.detectDisabled",
        severity: "info",
        condition: (ctx) => {
          if (ctx.level === "camera" && ctx.fullCameraConfig) {
            return ctx.fullCameraConfig.detect?.enabled === false;
          }
          return false;
        },
      },
    ],
    fieldMessages: [
      {
        key: "detections-all-non-alert",
        field: "detections.labels",
        messageKey: "configMessages.review.allNonAlertDetections",
        severity: "info",
        position: "after",
        condition: (ctx) => {
          const labels = (
            ctx.formData?.detections as Record<string, unknown> | undefined
          )?.labels;
          return !Array.isArray(labels) || labels.length === 0;
        },
      },
    ],
    fieldDocs: {
      "alerts.labels": "/configuration/review/#alerts-and-detections",
      "detections.labels": "/configuration/review/#alerts-and-detections",
      genai: "/configuration/genai/genai_review",
      "genai.image_source": "/configuration/genai/genai_review#image-source",
      "genai.additional_concerns":
        "/configuration/genai/genai_review#additional-concerns",
    },
    restartRequired: [],
    fieldOrder: ["alerts", "detections", "genai", "genai.enabled"],
    fieldGroups: {},
    hiddenFields: [
      "enabled_in_config",
      "alerts.enabled_in_config",
      "detections.enabled_in_config",
      "genai.enabled_in_config",
    ],
    advancedFields: [],
    uiSchema: {
      alerts: {
        "ui:before": { render: "CameraReviewStatusToggles" },
        labels: {
          "ui:widget": "reviewLabels",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        required_zones: {
          "ui:widget": "hidden",
        },
      },
      detections: {
        labels: {
          "ui:widget": "reviewLabels",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        required_zones: {
          "ui:widget": "hidden",
        },
      },
      genai: {
        additional_concerns: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            size: "full",
            multiline: true,
          },
        },
        activity_context_prompt: {
          "ui:widget": "textarea",
          "ui:options": {
            size: "full",
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
  },
};

export default review;
