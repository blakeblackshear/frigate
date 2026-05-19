import type { HiddenFieldContext } from "@/types/configForm";
import { getEffectiveAttributeLabels } from "@/utils/configUtil";
import type { SectionConfigOverrides } from "./types";

// Attribute labels (face, license_plate, Frigate+ couriers like DHL/Amazon,
// etc.) are populated into objects.filters by the backend for every
// attribute the model knows about. Hide the filter collapsible for an
// attribute unless it's in the effective objects.track list at this scope.
// When an attribute IS tracked, only a subset of fields are exposed — see the
// schema-modification path in modifySchemaForSection (objects branch) which
// promotes tracked attribute keys to explicit `properties` with a
// restricted FilterConfig shape so RJSF renders just that one field.
const hideAttributeFilters = ({
  fullConfig,
  fullCameraConfig,
  level,
  formData,
}: HiddenFieldContext): string[] => {
  const trackFromForm = Array.isArray(
    (formData as { track?: unknown } | undefined)?.track,
  )
    ? (formData as { track: string[] }).track
    : undefined;

  const track =
    trackFromForm ??
    (level !== "global" ? fullCameraConfig?.objects?.track : undefined) ??
    fullConfig.objects?.track ??
    [];

  return getEffectiveAttributeLabels(fullConfig, fullCameraConfig, level)
    .filter((attr) => !track.includes(attr))
    .map((attr) => `filters.${attr}`);
};

const objects: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_filters",
    messages: [
      {
        key: "detect-disabled",
        messageKey: "configMessages.detect.disabled",
        severity: "info",
        condition: (ctx) =>
          ctx.level === "camera" &&
          ctx.fullCameraConfig?.detect?.enabled === false,
      },
    ],
    fieldMessages: [
      {
        key: "genai-no-descriptions-provider",
        field: "genai.enabled",
        messageKey: "configMessages.objects.genaiNoDescriptionsProvider",
        severity: "warning",
        position: "before",
        condition: (ctx) => {
          const providers = ctx.fullConfig.genai;
          if (!providers || Object.keys(providers).length === 0) return true;
          return !Object.values(providers).some((agent) =>
            agent.roles?.includes("descriptions"),
          );
        },
      },
    ],
    fieldDocs: {
      "filters.min_area": "/configuration/object_filters#object-area",
      "filters.max_area": "/configuration/object_filters#object-area",
      "filters.min_score": "/configuration/object_filters#minimum-score",
      "filters.threshold": "/configuration/object_filters#threshold",
      "filters.min_ratio": "/configuration/object_filters/#object-proportions",
      "filters.max_ratio": "/configuration/object_filters/#object-proportions",
    },
    restartRequired: [],
    fieldOrder: ["track", "alert", "detect", "filters"],
    fieldGroups: {
      tracking: ["track", "alert", "detect"],
      filtering: ["filters"],
    },
    hiddenFields: [
      "enabled_in_config",
      "mask",
      "raw_mask",
      "genai.enabled_in_config",
      "filters.*.mask",
      "filters.*.raw_mask",
      "filters.mask",
      "filters.raw_mask",
      hideAttributeFilters,
    ],
    advancedFields: ["genai"],
    uiSchema: {
      filters: {
        "ui:options": {
          expandable: false,
        },
      },
      "filters.*.min_area": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      "filters.*": {
        "ui:options": {
          additionalPropertyKeyReadonly: true,
        },
      },
      "filters.*.max_area": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      track: {
        "ui:widget": "objectLabels",
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      genai: {
        objects: {
          "ui:widget": "objectLabels",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        prompt: {
          "ui:widget": "textarea",
          "ui:options": {
            size: "full",
          },
        },
        object_prompts: {
          additionalProperties: {
            "ui:options": {
              size: "full",
            },
          },
        },
        required_zones: {
          "ui:widget": "zoneNames",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        enabled_in_config: {
          "ui:widget": "hidden",
        },
      },
    },
  },
  global: {
    restartRequired: [],
    hiddenFields: [
      "enabled_in_config",
      "mask",
      "raw_mask",
      "genai.enabled_in_config",
      "filters.*.mask",
      "filters.*.raw_mask",
      "filters.mask",
      "filters.raw_mask",
      "genai.required_zones",
      hideAttributeFilters,
    ],
  },
  camera: {
    restartRequired: [],
  },
  replay: {
    restartRequired: [],
    fieldOrder: ["track", "filters"],
    fieldGroups: {
      tracking: ["track"],
      filtering: ["filters"],
    },
    hiddenFields: [
      "enabled_in_config",
      "alert",
      "detect",
      "mask",
      "raw_mask",
      "genai",
      "genai.enabled_in_config",
      "filters.*.mask",
      "filters.*.raw_mask",
      "filters.mask",
      "filters.raw_mask",
      hideAttributeFilters,
    ],
    advancedFields: [],
  },
};

export default objects;
