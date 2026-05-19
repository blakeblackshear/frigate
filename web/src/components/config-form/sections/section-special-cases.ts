/**
 * Special case handling for config sections with schema/default issues.
 *
 * Some sections have schema patterns that cause false "Modified" indicators
 * when navigating to them due to how defaults are applied. This utility
 * centralizes the logic for detecting and handling these cases.
 */

import { RJSFSchema } from "@rjsf/utils";
import { applySchemaDefaults } from "@/lib/config-schema";
import { isJsonObject } from "@/lib/utils";
import { HiddenFieldContext, JsonObject, JsonValue } from "@/types/configForm";
import { getEffectiveAttributeLabels } from "@/utils/configUtil";

/**
 * Sections that require special handling at the global level.
 * Add new section paths here as needed.
 */
const SPECIAL_CASE_SECTIONS = ["motion", "detectors", "genai"] as const;

/**
 * Check if a section requires special case handling.
 */
export function isSpecialCaseSection(
  sectionPath: string,
  level: string,
): boolean {
  return (
    level === "global" &&
    SPECIAL_CASE_SECTIONS.includes(
      sectionPath as (typeof SPECIAL_CASE_SECTIONS)[number],
    )
  );
}

/**
 * Modify schema for sections that need defaults stripped or other modifications.
 *
 * - detectors: Strip the "default" field to prevent RJSF from merging the
 *   default {"cpu": {"type": "cpu"}} with stored detector keys.
 * - genai: Inject a default provider value on the additionalProperties shape.
 * - objects: Promote tracked attribute labels (face, license_plate, courier
 *   logos) from `filters.additionalProperties` to explicit
 *   `filters.properties.<attr>` entries with a restricted FilterConfig
 *   shape, so RJSF renders just that one field for
 *   attribute filters. Non-attribute tracked labels (person, car, …)
 *   keep flowing through the unmodified `additionalProperties` and render
 *   the full FilterConfig form.
 */
export function modifySchemaForSection(
  sectionPath: string,
  level: string,
  schema: RJSFSchema | undefined,
  ctx?: HiddenFieldContext,
): RJSFSchema | undefined {
  if (!schema) return schema;

  if (sectionPath === "objects") {
    return modifyObjectsSchema(schema, ctx);
  }

  if (!isSpecialCaseSection(sectionPath, level)) {
    return schema;
  }

  // detectors: Remove default to prevent merging with stored keys
  if (sectionPath === "detectors" && "default" in schema) {
    const { default: _, ...schemaWithoutDefault } = schema;
    return schemaWithoutDefault;
  }

  if (sectionPath === "genai") {
    const additional = schema.additionalProperties;
    if (
      additional &&
      typeof additional === "object" &&
      !Array.isArray(additional)
    ) {
      const props = (additional as RJSFSchema).properties;
      if (props && typeof props.provider === "object") {
        return {
          ...schema,
          additionalProperties: {
            ...additional,
            properties: {
              ...props,
              provider: { ...(props.provider as object), default: "openai" },
            },
          },
        };
      }
    }
  }

  return schema;
}

/**
 * Build a stripped FilterConfig schema for tracked attribute filters
 * (face, license_plate, etc.). Keeps only the fields meaningful for
 * attribute detections — `min_score`, `min_area`, `max_area`. `threshold`
 * and the ratio fields aren't exposed: attributes don't flow through
 * `_is_false_positive` (no median-of-history check), and aspect-ratio
 * filtering isn't a typical attribute-tuning knob.
 *
 * `min_area` and `max_area` are `Union[int, float]` in Pydantic which
 * emits as `anyOf` in JSON schema; we flatten to a plain `number` so RJSF
 * doesn't render the int/float type-selector dropdown for each attribute
 * filter. The backend still accepts either int (pixels) or float
 * (percentage) since the underlying FilterConfig union is unchanged.
 */
function buildAttributeFilterSchema(
  filterConfigSchema: RJSFSchema,
  attributeLabel: string,
): RJSFSchema {
  const props = isJsonObject(
    (filterConfigSchema as { properties?: unknown }).properties,
  )
    ? (filterConfigSchema as { properties: Record<string, RJSFSchema> })
        .properties
    : undefined;

  const minScoreSchema =
    props && props.min_score ? props.min_score : { type: "number" };

  const flattenToNumber = (src: RJSFSchema | undefined): RJSFSchema => {
    if (!src) return { type: "number" };
    const { anyOf: _anyOf, ...rest } = src as {
      anyOf?: unknown;
      [k: string]: unknown;
    };
    return { ...rest, type: "number" } as RJSFSchema;
  };

  return {
    type: "object",
    title: attributeLabel,
    properties: {
      min_score: minScoreSchema,
      min_area: flattenToNumber(props && props.min_area),
      max_area: flattenToNumber(props && props.max_area),
    },
    additionalProperties: false,
  } as RJSFSchema;
}

function modifyObjectsSchema(
  schema: RJSFSchema,
  ctx: HiddenFieldContext | undefined,
): RJSFSchema {
  if (!ctx) return schema;

  const allAttributes = getEffectiveAttributeLabels(
    ctx.fullConfig,
    ctx.fullCameraConfig,
    ctx.level,
  );

  // Resolve effective track at this scope, falling back through camera
  // config then global config (matches hideAttributeFilters in objects.ts).
  const trackFromForm = Array.isArray(
    (ctx.formData as { track?: unknown } | undefined)?.track,
  )
    ? (ctx.formData as { track: string[] }).track
    : undefined;
  const track =
    trackFromForm ??
    (ctx.level !== "global"
      ? ctx.fullCameraConfig?.objects?.track
      : undefined) ??
    ctx.fullConfig.objects?.track ??
    [];

  if (track.length === 0) return schema;

  const schemaProperties = isJsonObject(
    (schema as { properties?: unknown }).properties,
  )
    ? (schema as { properties: Record<string, RJSFSchema> }).properties
    : undefined;
  const filtersSchema =
    schemaProperties && schemaProperties.filters
      ? schemaProperties.filters
      : undefined;
  if (!filtersSchema) return schema;

  const filterEntrySchema = isJsonObject(
    (filtersSchema as { additionalProperties?: unknown }).additionalProperties,
  )
    ? (filtersSchema as { additionalProperties: RJSFSchema })
        .additionalProperties
    : undefined;
  if (!filterEntrySchema) return schema;

  const attributeSet = new Set(allAttributes);
  const existingProperties = isJsonObject(
    (filtersSchema as { properties?: unknown }).properties,
  )
    ? (filtersSchema as { properties: Record<string, RJSFSchema> }).properties
    : {};

  // Promote every tracked label to an explicit property entry so RJSF
  // renders it as a normal collapsible (no additionalProperties key/value
  // editor UI). Attribute labels get a restricted shape with only
  // `min_score`; non-attribute labels get the full FilterConfig. Sorted
  // alphabetically so the filter collapsibles match the order of the
  // sibling `track` switches.
  const sortedTrackedLabels = track
    .filter((label): label is string => typeof label === "string")
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const updatedFilterProperties: Record<string, RJSFSchema> = {
    ...existingProperties,
  };
  for (const label of sortedTrackedLabels) {
    if (attributeSet.has(label)) {
      updatedFilterProperties[label] = buildAttributeFilterSchema(
        filterEntrySchema,
        label,
      );
    } else {
      updatedFilterProperties[label] = {
        ...filterEntrySchema,
        title: label,
      } as RJSFSchema;
    }
  }

  const updatedFiltersSchema: RJSFSchema = {
    ...filtersSchema,
    properties: updatedFilterProperties,
  };

  return {
    ...schema,
    properties: {
      ...schemaProperties,
      filters: updatedFiltersSchema,
    },
  };
}

/**
 * Get effective defaults for sections with special schema patterns.
 *
 * - motion: Has anyOf schema with [null, MotionConfig]. When stored value is
 *   null, derive defaults from the non-null anyOf branch to avoid showing
 *   changes when navigating to the page.
 * - detectors: Return empty object since the schema default would add unwanted
 *   keys to the stored configuration.
 */
export function getEffectiveDefaultsForSection(
  sectionPath: string,
  level: string,
  schema: RJSFSchema | undefined,
  schemaDefaults: unknown,
): unknown {
  if (!isSpecialCaseSection(sectionPath, level) || !schema) {
    return schemaDefaults;
  }

  // motion: Derive defaults from non-null anyOf branch
  if (sectionPath === "motion") {
    const anyOfSchemas = (schema as { anyOf?: unknown[] }).anyOf;
    if (!anyOfSchemas || !Array.isArray(anyOfSchemas)) {
      return schemaDefaults;
    }

    // Find the non-null motion config schema
    const motionSchema = anyOfSchemas.find(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        (s as { type?: string }).type !== "null",
    );

    if (!motionSchema) {
      return schemaDefaults;
    }

    return applySchemaDefaults(motionSchema as RJSFSchema, {});
  }

  // detectors: Return empty object to avoid adding default keys
  if (sectionPath === "detectors") {
    return {};
  }

  return schemaDefaults;
}

// Sections whose `filters` dict is keyed by a sibling list field. The backend
// auto-populates these filters at config init but doesn't re-run after profile
// merges, so we synthesize the missing entries on the frontend.
const FILTER_SECTIONS: Record<string, { listField: string }> = {
  objects: { listField: "track" },
  audio: { listField: "listen" },
};

/**
 * Add default filter entries for any label in the section's list field
 * (e.g. `objects.track`, `audio.listen`) that isn't already in `filters`, so
 * each label gets a collapsible. The backend only auto-populates filters at
 * config init, not after profile merges.
 */
export function synthesizeMissingFilters(
  sectionPath: string,
  data: unknown,
  sectionSchema: RJSFSchema | undefined,
): unknown {
  const sectionConfig = FILTER_SECTIONS[sectionPath];
  if (!sectionConfig) return data;
  if (!isJsonObject(data)) return data;

  const listValue = (data as JsonObject)[sectionConfig.listField];
  if (!Array.isArray(listValue) || listValue.length === 0) return data;

  const properties = (sectionSchema as { properties?: Record<string, unknown> })
    ?.properties;
  const filtersSchema = isJsonObject(properties)
    ? (properties.filters as { additionalProperties?: unknown } | undefined)
    : undefined;
  const filterEntrySchema = isJsonObject(filtersSchema?.additionalProperties)
    ? (filtersSchema.additionalProperties as RJSFSchema)
    : undefined;

  const existingFilters = isJsonObject((data as JsonObject).filters)
    ? ((data as JsonObject).filters as JsonObject)
    : {};

  const newFilters: JsonObject = { ...existingFilters };
  let added = false;
  for (const label of listValue) {
    if (typeof label !== "string") continue;
    if (Object.prototype.hasOwnProperty.call(newFilters, label)) continue;
    newFilters[label] = (
      filterEntrySchema ? applySchemaDefaults(filterEntrySchema, {}) : {}
    ) as JsonValue;
    added = true;
  }

  if (!added) return data;
  return { ...(data as JsonObject), filters: newFilters };
}

/**
 * Sanitize overrides payloads for section-specific quirks.
 */
export function sanitizeOverridesForSection(
  sectionPath: string,
  level: string,
  overrides: unknown,
): unknown {
  if (!overrides || !isJsonObject(overrides)) {
    return overrides;
  }

  if (sectionPath === "ffmpeg" && level === "camera") {
    const overridesObj = overrides as JsonObject;
    const inputs = overridesObj.inputs;
    if (!Array.isArray(inputs)) {
      return overrides;
    }

    const cleanedInputs = inputs.map((input) => {
      if (!isJsonObject(input)) {
        return input;
      }

      const cleanedInput = { ...input } as JsonObject;
      ["global_args", "hwaccel_args", "input_args"].forEach((key) => {
        const value = cleanedInput[key];
        if (Array.isArray(value) && value.length === 0) {
          delete cleanedInput[key];
        }
      });

      return cleanedInput;
    });

    return {
      ...overridesObj,
      inputs: cleanedInputs,
    };
  }

  const flattenRecordWithDots = (
    value: JsonObject,
    prefix: string = "",
  ): JsonObject => {
    const flattened: JsonObject = {};
    Object.entries(value).forEach(([key, entry]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (isJsonObject(entry)) {
        Object.assign(flattened, flattenRecordWithDots(entry, nextKey));
      } else {
        flattened[nextKey] = entry as JsonValue;
      }
    });
    return flattened;
  };

  // detectors: Strip readonly model fields that are generated on startup
  // and should never be persisted back to the config file.
  if (sectionPath === "detectors") {
    const overridesObj = overrides as JsonObject;
    const cleaned: JsonObject = {};

    Object.entries(overridesObj).forEach(([key, value]) => {
      if (!isJsonObject(value)) {
        cleaned[key] = value;
        return;
      }

      const cleanedValue = { ...value } as JsonObject;
      delete cleanedValue.model;
      delete cleanedValue.model_path;
      cleaned[key] = cleanedValue;
    });

    return cleaned;
  }

  if (sectionPath === "logger") {
    const overridesObj = overrides as JsonObject;
    const logs = overridesObj.logs;
    if (isJsonObject(logs)) {
      return {
        ...overridesObj,
        logs: flattenRecordWithDots(logs),
      };
    }
  }

  if (sectionPath === "environment_vars") {
    const overridesObj = overrides as JsonObject;
    return flattenRecordWithDots(overridesObj);
  }

  return overrides;
}
