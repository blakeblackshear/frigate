import get from "lodash/get";
import isEqual from "lodash/isEqual";
import { isJsonObject } from "@/lib/utils";
import type { JsonValue } from "@/types/configForm";

export const getOverrideAtPath = (
  overrides: JsonValue | undefined,
  path: Array<string | number>,
) => {
  if (overrides === undefined || overrides === null) {
    return undefined;
  }

  if (isJsonObject(overrides) || Array.isArray(overrides)) {
    return get(overrides, path);
  }

  return path.length === 0 ? overrides : undefined;
};

export const normalizeOverridePath = (
  path: Array<string | number>,
  data: JsonValue | undefined,
) => {
  if (data === undefined || data === null) {
    return path;
  }

  const normalized: Array<string | number> = [];
  let cursor: JsonValue | undefined = data;

  for (const segment of path) {
    if (typeof segment === "number") {
      if (Array.isArray(cursor)) {
        normalized.push(segment);
        cursor = cursor[segment] as JsonValue | undefined;
      }
      continue;
    }

    normalized.push(segment);

    if (isJsonObject(cursor) || Array.isArray(cursor)) {
      cursor = (cursor as Record<string, JsonValue>)[segment];
    } else {
      cursor = undefined;
    }
  }

  return normalized;
};

export const hasOverrideAtPath = (
  overrides: JsonValue | undefined,
  path: Array<string | number>,
  contextData?: JsonValue,
) => {
  const normalizedPath = contextData
    ? normalizeOverridePath(path, contextData)
    : path;
  const value = getOverrideAtPath(overrides, normalizedPath);
  if (value !== undefined) {
    return true;
  }
  const shouldFallback =
    normalizedPath.length !== path.length ||
    normalizedPath.some((segment, index) => segment !== path[index]);
  if (!shouldFallback) {
    return false;
  }
  return getOverrideAtPath(overrides, path) !== undefined;
};

/**
 * Deep normalization for form data comparison. Strips null, undefined,
 * and empty-string values from objects and arrays so that RJSF-injected
 * schema defaults (e.g., `mask: null`) don't cause false positives
 * against a baseline that lacks those keys.
 */
export const deepNormalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value.map(deepNormalizeValue);
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const normalized = deepNormalizeValue(v);
      if (normalized !== undefined) {
        result[k] = normalized;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return value;
};

/**
 * Shallow normalization for individual field values.
 * Treats null and empty-string as equivalent to undefined.
 */
export const normalizeFieldValue = (value: unknown): unknown =>
  value === null || value === "" ? undefined : value;

/**
 * Check whether a subtree of form data has been modified relative to
 * the baseline. Uses deep normalization to ignore RJSF-injected null/empty
 * schema defaults.
 *
 * @param currentData - The current value at the subtree (from props.formData)
 * @param baselineData - The baseline value at the subtree (from formContext.baselineFormData)
 * @param overrides - Fallback: the overrides object from formContext
 * @param path - The full field path for the fallback override check
 * @param contextData - The full form data for normalizing the override path
 */
export const isSubtreeModified = (
  currentData: unknown,
  baselineData: unknown,
  overrides: JsonValue | undefined,
  path: Array<string | number>,
  contextData?: JsonValue,
): boolean => {
  if (baselineData !== undefined || currentData !== undefined) {
    return !isEqual(
      deepNormalizeValue(currentData),
      deepNormalizeValue(baselineData),
    );
  }
  return hasOverrideAtPath(overrides, path, contextData);
};
