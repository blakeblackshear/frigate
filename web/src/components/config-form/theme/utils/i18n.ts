/**
 * Shared i18n utilities for config form templates and fields.
 *
 * These functions handle translation key path building and label normalization
 * for RJSF form fields.
 */

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * normalizes dynamic segments like filter object names or detector names.
 *
 * @param segments Array of path segments (strings and/or numbers)
 * @param sectionI18nPrefix Optional section prefix for specialized sections
 * @returns Normalized translation key path as a dot-separated string
 *
 * @example
 * buildTranslationPath(["filters", "person", "threshold"]) => "filters.threshold"
 * buildTranslationPath(["detectors", "ov1", "type"]) => "detectors.type"
 * buildTranslationPath(["model", "type"], "detectors") => "type"
 */
export function buildTranslationPath(
  segments: Array<string | number>,
  sectionI18nPrefix?: string,
): string {
  // Filter out numeric indices to get string segments only
  const stringSegments = segments.filter(
    (segment): segment is string => typeof segment === "string",
  );

  // Handle filters section - skip the dynamic filter object name
  // Example: filters.person.threshold -> filters.threshold
  const filtersIndex = stringSegments.indexOf("filters");
  if (filtersIndex !== -1 && stringSegments.length > filtersIndex + 2) {
    const normalized = [
      ...stringSegments.slice(0, filtersIndex + 1),
      ...stringSegments.slice(filtersIndex + 2),
    ];
    return normalized.join(".");
  }

  // Handle detectors section - skip the dynamic detector name
  // Example: detectors.ov1.type -> detectors.type
  const detectorsIndex = stringSegments.indexOf("detectors");
  if (detectorsIndex !== -1 && stringSegments.length > detectorsIndex + 2) {
    const normalized = [
      ...stringSegments.slice(0, detectorsIndex + 1),
      ...stringSegments.slice(detectorsIndex + 2),
    ];
    return normalized.join(".");
  }

  // Handle specialized sections like detectors where the first segment is dynamic
  // Example: (sectionI18nPrefix="detectors") "ov1.type" -> "type"
  if (sectionI18nPrefix === "detectors" && stringSegments.length > 1) {
    return stringSegments.slice(1).join(".");
  }

  return stringSegments.join(".");
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
