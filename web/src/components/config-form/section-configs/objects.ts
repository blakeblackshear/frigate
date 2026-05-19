import type { HiddenFieldContext } from "@/types/configForm";
import { getEffectiveAttributeLabels } from "@/utils/configUtil";
import type { SectionConfigOverrides } from "./types";

// Attribute labels (face, license_plate, Frigate+ couriers like DHL/Amazon,
// etc.) are populated into objects.filters by the backend for every
// attribute the model knows about.
//
// - Untracked attributes: hide the whole `filters.<attr>` collapsible.
// - Tracked attributes: strip the FilterConfig fields we don't expose
//   (`threshold`, `min_ratio`, `max_ratio`) from the form data so RJSF
//   doesn't surface them as ad-hoc additionalProperties entries under the
//   restricted AttributeFilter schema (see modifySchemaForSection objects
//   branch). The data is sanitized out symmetrically from the baseline
//   too, so power-user YAML values for those fields are preserved on save
//   (buildOverrides only emits diffs of fields the form has seen).
const ATTRIBUTE_FILTER_HIDDEN_SUBFIELDS = [
  "threshold",
  "min_ratio",
  "max_ratio",
];

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

  const attrs = getEffectiveAttributeLabels(
    fullConfig,
    fullCameraConfig,
    level,
  );
  const hidden: string[] = [];
  for (const attr of attrs) {
    if (!track.includes(attr)) {
      hidden.push(`filters.${attr}`);
    } else {
      for (const field of ATTRIBUTE_FILTER_HIDDEN_SUBFIELDS) {
        hidden.push(`filters.${attr}.${field}`);
      }
    }
  }
  return hidden;
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
