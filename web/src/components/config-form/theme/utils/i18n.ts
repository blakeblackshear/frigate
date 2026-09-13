/**
 * Shared i18n utilities for config form templates and fields.
 *
 * These functions handle translation key path building and label normalization
 * for RJSF form fields.
 */

import type { ConfigFormContext } from "@/types/configForm";
import { getEffectiveAttributeLabels } from "@/utils/configUtil";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * normalizes dynamic segments like filter object names.
 *
 * @param segments Array of path segments (strings and/or numbers)
 * @param formContext Optional form context for resolving attribute labels
 * @returns Normalized translation key path as a dot-separated string
 *
 * @example
 * buildTranslationPath(["filters", "person", "threshold"]) => "filters.threshold"
 */
export function buildTranslationPath(
  segments: Array<string | number>,
  formContext?: ConfigFormContext,
): string {
  // Filter out numeric indices to get string segments only
  const stringSegments = segments.filter(
    (segment): segment is string => typeof segment === "string",
  );

  // Handle filters section - skip the dynamic filter object name. Route
  // to `filters_attribute.<field>` when the dynamic key is an attribute
  // label (face, license_plate, courier logos) so attribute filter fields
  // pick up the attribute-worded translations emitted by
  // generate_config_translations.py.
  // Example: filters.person.threshold      -> filters.threshold
  // Example: filters.face.min_area         -> filters_attribute.min_area
  const filtersIndex = stringSegments.indexOf("filters");
  if (filtersIndex !== -1 && stringSegments.length > filtersIndex + 2) {
    const filterKey = stringSegments[filtersIndex + 1];
    const allAttributes = getEffectiveAttributeLabels(
      formContext?.fullConfig,
      formContext?.fullCameraConfig,
      formContext?.level,
    );
    const sectionWord = allAttributes.includes(filterKey)
      ? "filters_attribute"
      : "filters";
    const normalized = [
      ...stringSegments.slice(0, filtersIndex),
      sectionWord,
      ...stringSegments.slice(filtersIndex + 2),
    ];
    return normalized.join(".");
  }

  return stringSegments.join(".");
}

/**
 * Resolve a translated label or description for a config form field.
 *
 * Tries keys in priority order:
 *   1. Type-specific prefixed key (e.g. "detectors.edgetpu.device.label")
 *   2. Shared prefixed key with type stripped (e.g. "detectors.device.label")
 *   3. Unprefixed key (e.g. "device.label")
 *
 * @returns The translated string, or undefined if no key matched.
 */
export function resolveConfigTranslation(
  i18n: { exists: (key: string, opts?: Record<string, unknown>) => boolean },
  t: (key: string, opts?: Record<string, unknown>) => string,
  translationPath: string,
  suffix: "label" | "description",
  sectionI18nPrefix?: string,
  ns?: string,
): string | undefined {
  const opts = ns ? { ns } : undefined;

  if (
    sectionI18nPrefix &&
    !translationPath.startsWith(`${sectionI18nPrefix}.`)
  ) {
    // 1. Type-specific prefixed key (e.g. detectors.edgetpu.device.label)
    const prefixed = `${sectionI18nPrefix}.${translationPath}.${suffix}`;
    if (i18n.exists(prefixed, opts)) return t(prefixed, opts);

    // 2. Shared prefixed key — strip leading type segment
    //    e.g. detectors.edgetpu.model.path → detectors.model.path
    const dot = translationPath.indexOf(".");
    if (dot !== -1) {
      const shared = `${sectionI18nPrefix}.${translationPath.substring(dot + 1)}.${suffix}`;
      if (i18n.exists(shared, opts)) return t(shared, opts);
    }
  }

  // 3. Unprefixed key
  const base = `${translationPath}.${suffix}`;
  if (i18n.exists(base, opts)) return t(base, opts);

  return undefined;
}

/**
 * Extract the filter object label from a path containing "filters" segment.
 * Returns the segment immediately after "filters".
 *
 * @param pathSegments Array of path segments
 * @returns The filter object label or undefined if not found
 *
 * @example
 * getFilterObjectLabel(["filters", "person", "threshold"]) => "person"
 * getFilterObjectLabel(["detect", "enabled"]) => undefined
 */
export function getFilterObjectLabel(
  pathSegments: Array<string | number>,
): string | undefined {
  const filtersIndex = pathSegments.indexOf("filters");
  if (filtersIndex === -1 || pathSegments.length <= filtersIndex + 1) {
    return undefined;
  }
  const objectLabel = pathSegments[filtersIndex + 1];
  return typeof objectLabel === "string" && objectLabel.length > 0
    ? objectLabel
    : undefined;
}

/**
 * Convert snake_case string to Title Case with spaces.
 * Useful for generating human-readable labels from schema property names.
 *
 * @param value The snake_case string to convert
 * @returns Title Case string
 *
 * @example
 * humanizeKey("detect_fps") => "Detect Fps"
 * humanizeKey("min_initialized") => "Min Initialized"
 */
export function humanizeKey(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Extract domain name from an i18n namespace string.
 * Handles config/* namespace format by stripping the prefix.
 *
 * @param ns The i18n namespace (e.g., "config/audio", "config/global")
 * @returns The domain portion (e.g., "audio", "global") or empty string
 *
 * @example
 * getDomainFromNamespace("config/audio") => "audio"
 * getDomainFromNamespace("common") => ""
 */
export function getDomainFromNamespace(ns?: string): string {
  if (!ns || !ns.startsWith("config/")) return "";
  return ns.replace("config/", "");
}
