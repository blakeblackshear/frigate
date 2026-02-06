/**
 * Shared i18n utilities for config form templates and fields.
 *
 * These functions handle translation key path building and label normalization
 * for RJSF form fields.
 */

import type { ConfigFormContext } from "@/types/configForm";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const resolveDetectorType = (
  detectorConfig: unknown,
  detectorKey?: string,
): string | undefined => {
  if (!detectorKey || !isRecord(detectorConfig)) {
    return undefined;
  }

  const entry = detectorConfig[detectorKey];
  if (!isRecord(entry)) {
    return undefined;
  }

  const typeValue = entry.type;
  return typeof typeValue === "string" && typeValue.length > 0
    ? typeValue
    : undefined;
};

const resolveDetectorTypeFromContext = (
  formContext: ConfigFormContext | undefined,
  detectorKey?: string,
): string | undefined => {
  const formData = formContext?.formData;
  if (!detectorKey || !isRecord(formData)) {
    return undefined;
  }

  const detectorConfig = isRecord(formData.detectors)
    ? formData.detectors
    : formData;

  return resolveDetectorType(detectorConfig, detectorKey);
};

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * normalizes dynamic segments like filter object names or detector names.
 *
 * @param segments Array of path segments (strings and/or numbers)
 * @param sectionI18nPrefix Optional section prefix for specialized sections
 * @param formContext Optional form context for resolving detector types
 * @returns Normalized translation key path as a dot-separated string
 *
 * @example
 * buildTranslationPath(["filters", "person", "threshold"]) => "filters.threshold"
 * buildTranslationPath(["detectors", "ov1", "type"]) => "detectors.openvino.type"
 * buildTranslationPath(["ov1", "type"], "detectors") => "openvino.type"
 */
export function buildTranslationPath(
  segments: Array<string | number>,
  sectionI18nPrefix?: string,
  formContext?: ConfigFormContext,
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

  // Handle detectors section - resolve the detector type when available
  // Example: detectors.ov1.type -> detectors.openvino.type
  const detectorsIndex = stringSegments.indexOf("detectors");
  if (detectorsIndex !== -1 && stringSegments.length > detectorsIndex + 2) {
    const detectorKey = stringSegments[detectorsIndex + 1];
    const detectorType = resolveDetectorTypeFromContext(
      formContext,
      detectorKey,
    );
    if (detectorType) {
      const normalized = [
        ...stringSegments.slice(0, detectorsIndex + 1),
        detectorType,
        ...stringSegments.slice(detectorsIndex + 2),
      ];
      return normalized.join(".");
    }

    const normalized = [
      ...stringSegments.slice(0, detectorsIndex + 1),
      ...stringSegments.slice(detectorsIndex + 2),
    ];
    return normalized.join(".");
  }

  // Handle specialized sections like detectors where the first segment is dynamic
  // Example: (sectionI18nPrefix="detectors") "ov1.type" -> "openvino.type"
  if (sectionI18nPrefix === "detectors" && stringSegments.length > 1) {
    const detectorKey = stringSegments[0];
    const detectorType = resolveDetectorTypeFromContext(
      formContext,
      detectorKey,
    );
    if (detectorType) {
      return [detectorType, ...stringSegments.slice(1)].join(".");
    }

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
