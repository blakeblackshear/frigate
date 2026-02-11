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
import { JsonObject, JsonValue } from "@/types/configForm";

/**
 * Sections that require special handling at the global level.
 * Add new section paths here as needed.
 */
const SPECIAL_CASE_SECTIONS = ["motion", "detectors"] as const;

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
 */
export function modifySchemaForSection(
  sectionPath: string,
  level: string,
  schema: RJSFSchema | undefined,
): RJSFSchema | undefined {
  if (!schema || !isSpecialCaseSection(sectionPath, level)) {
    return schema;
  }

  // detectors: Remove default to prevent merging with stored keys
  if (sectionPath === "detectors" && "default" in schema) {
    const { default: _, ...schemaWithoutDefault } = schema;
    return schemaWithoutDefault;
  }

  return schema;
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
