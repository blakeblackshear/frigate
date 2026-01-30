// Hook to detect when camera config overrides global defaults
import { useMemo } from "react";
import isEqual from "lodash/isEqual";
import get from "lodash/get";
import set from "lodash/set";
import { FrigateConfig } from "@/types/frigateConfig";
import { JsonObject, JsonValue } from "@/types/configForm";
import { isJsonObject } from "@/lib/utils";

const INTERNAL_FIELD_SUFFIXES = ["enabled_in_config", "raw_mask"];

function stripInternalFields(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(stripInternalFields);
  }

  if (isJsonObject(value)) {
    const obj = value;
    const cleaned: JsonObject = {};
    for (const [key, val] of Object.entries(obj)) {
      if (INTERNAL_FIELD_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
        continue;
      }
      cleaned[key] = stripInternalFields(val as JsonValue);
    }
    return cleaned;
  }

  return value;
}

export function normalizeConfigValue(value: unknown): JsonValue {
  return stripInternalFields(value as JsonValue);
}

export interface OverrideStatus {
  /** Whether the field is overridden from global */
  isOverridden: boolean;
  /** The global default value */
  globalValue: unknown;
  /** The camera-specific value */
  cameraValue: unknown;
}

export interface UseConfigOverrideOptions {
  /** Full Frigate config */
  config: FrigateConfig | undefined;
  /** Camera name for per-camera settings */
  cameraName?: string;
  /** Config section path (e.g., "detect", "record.events") */
  sectionPath: string;
  /** Optional list of field paths to compare for overrides */
  compareFields?: string[];
}

function pickFields(value: unknown, fields: string[]): JsonObject {
  if (!fields || fields.length === 0) {
    return {};
  }

  const result: JsonObject = {};
  fields.forEach((path) => {
    if (!path) return;
    const fieldValue = get(value as JsonObject, path);
    if (fieldValue !== undefined) {
      set(result, path, fieldValue);
    }
  });
  return result;
}

/**
 * Hook to detect config overrides between global and camera level
 *
 * @example
 * ```tsx
 * const { isOverridden, getFieldOverride } = useConfigOverride({
 *   config,
 *   cameraName: "front_door",
 *   sectionPath: "detect"
 * });
 *
 * // Check if entire section is overridden
 * if (isOverridden) {
 *   // Show override indicator
 * }
 *
 * // Check specific field
 * const fpsOverride = getFieldOverride("fps");
 * ```
 */
export function useConfigOverride({
  config,
  cameraName,
  sectionPath,
  compareFields,
}: UseConfigOverrideOptions) {
  return useMemo(() => {
    if (!config) {
      return {
        isOverridden: false,
        globalValue: undefined,
        cameraValue: undefined,
        getFieldOverride: () => ({
          isOverridden: false,
          globalValue: undefined,
          cameraValue: undefined,
        }),
        resetToGlobal: () => undefined,
      };
    }

    // Get global value for the section
    const globalValue = get(config, sectionPath);

    // If no camera specified, return global value info
    if (!cameraName) {
      return {
        isOverridden: false,
        globalValue,
        cameraValue: globalValue,
        getFieldOverride: (fieldPath: string): OverrideStatus => ({
          isOverridden: false,
          globalValue: get(globalValue, fieldPath),
          cameraValue: get(globalValue, fieldPath),
        }),
        resetToGlobal: () => globalValue,
      };
    }

    // Get camera-specific value
    const cameraConfig = config.cameras?.[cameraName];
    if (!cameraConfig) {
      return {
        isOverridden: false,
        globalValue,
        cameraValue: undefined,
        getFieldOverride: () => ({
          isOverridden: false,
          globalValue: undefined,
          cameraValue: undefined,
        }),
        resetToGlobal: () => globalValue,
      };
    }

    const cameraValue = get(cameraConfig, sectionPath);

    const normalizedGlobalValue = normalizeConfigValue(globalValue);
    const normalizedCameraValue = normalizeConfigValue(cameraValue);

    const comparisonGlobal = compareFields
      ? pickFields(normalizedGlobalValue, compareFields)
      : normalizedGlobalValue;
    const comparisonCamera = compareFields
      ? pickFields(normalizedCameraValue, compareFields)
      : normalizedCameraValue;

    // Check if the entire section is overridden
    const isOverridden = compareFields
      ? compareFields.length > 0 && !isEqual(comparisonGlobal, comparisonCamera)
      : !isEqual(comparisonGlobal, comparisonCamera);

    /**
     * Get override status for a specific field within the section
     */
    const getFieldOverride = (fieldPath: string): OverrideStatus => {
      const globalFieldValue = get(normalizedGlobalValue, fieldPath);
      const cameraFieldValue = get(normalizedCameraValue, fieldPath);

      return {
        isOverridden: !isEqual(globalFieldValue, cameraFieldValue),
        globalValue: globalFieldValue,
        cameraValue: cameraFieldValue,
      };
    };

    /**
     * Returns the global value to reset camera override
     */
    const resetToGlobal = (fieldPath?: string) => {
      if (fieldPath) {
        return get(normalizedGlobalValue, fieldPath);
      }
      return normalizedGlobalValue;
    };

    return {
      isOverridden,
      globalValue: normalizedGlobalValue,
      cameraValue: normalizedCameraValue,
      getFieldOverride,
      resetToGlobal,
    };
  }, [config, cameraName, sectionPath, compareFields]);
}

/**
 * Hook to get all overridden fields for a camera
 */
export function useAllCameraOverrides(
  config: FrigateConfig | undefined,
  cameraName: string | undefined,
) {
  return useMemo(() => {
    if (!config || !cameraName) {
      return [];
    }

    const cameraConfig = config.cameras?.[cameraName];
    if (!cameraConfig) {
      return [];
    }

    const overriddenSections: string[] = [];

    // Check each section that can be overridden
    const sectionsToCheck: Array<{
      key: string;
      compareFields?: string[];
    }> = [
      { key: "detect" },
      { key: "record" },
      { key: "snapshots" },
      { key: "motion" },
      { key: "objects" },
      { key: "review" },
      { key: "audio" },
      { key: "notifications" },
      { key: "live" },
      { key: "timestamp_style" },
      {
        key: "audio_transcription",
        compareFields: ["enabled", "live_enabled"],
      },
      { key: "birdseye", compareFields: ["enabled", "mode"] },
      { key: "face_recognition", compareFields: ["enabled", "min_area"] },
      {
        key: "ffmpeg",
        compareFields: [
          "path",
          "global_args",
          "hwaccel_args",
          "input_args",
          "output_args",
          "retry_interval",
          "apple_compatibility",
          "gpu",
        ],
      },
      {
        key: "lpr",
        compareFields: ["enabled", "min_area", "enhancement"],
      },
    ];

    for (const { key, compareFields } of sectionsToCheck) {
      const globalValue = normalizeConfigValue(get(config, key));
      const cameraValue = normalizeConfigValue(get(cameraConfig, key));

      const comparisonGlobal = compareFields
        ? pickFields(globalValue, compareFields)
        : globalValue;
      const comparisonCamera = compareFields
        ? pickFields(cameraValue, compareFields)
        : cameraValue;

      if (
        compareFields && compareFields.length === 0
          ? false
          : !isEqual(comparisonGlobal, comparisonCamera)
      ) {
        overriddenSections.push(key);
      }
    }

    return overriddenSections;
  }, [config, cameraName]);
}
