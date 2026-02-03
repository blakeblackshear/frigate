/**
 * Special case handling for config sections with schema/default issues.
 *
 * Some sections have schema patterns that cause false "Modified" indicators
 * when navigating to them due to how defaults are applied. This utility
 * centralizes the logic for detecting and handling these cases.
 */

import { RJSFSchema } from "@rjsf/utils";
import { applySchemaDefaults } from "@/lib/config-schema";

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
