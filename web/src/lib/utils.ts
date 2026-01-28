import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UiSchema } from "@rjsf/utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deep merges uiSchema objects, preserving nested properties from the base schema
 * when overrides don't explicitly replace them.
 *
 * Special handling for ui:options - merges nested options rather than replacing them.
 */
export function mergeUiSchema(
  base: UiSchema = {},
  overrides: UiSchema = {},
): UiSchema {
  const result: UiSchema = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (
      key === "ui:options" &&
      base[key] &&
      typeof value === "object" &&
      value !== null
    ) {
      // Merge ui:options objects instead of replacing
      result[key] = {
        ...(typeof base[key] === "object" && base[key] !== null
          ? base[key]
          : {}),
        ...value,
      };
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Recursively merge nested objects (field configurations)
      result[key] = mergeUiSchema(base[key] as UiSchema, value as UiSchema);
    } else {
      // Replace primitive values and arrays
      result[key] = value;
    }
  }

  return result;
}
