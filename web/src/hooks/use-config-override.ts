// Hook to detect when camera config overrides global defaults
import { useMemo } from "react";
import isEqual from "lodash/isEqual";
import get from "lodash/get";
import type { FrigateConfig } from "@/types/frigateConfig";

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

    // Check if the entire section is overridden
    const isOverridden = !isEqual(globalValue, cameraValue);

    /**
     * Get override status for a specific field within the section
     */
    const getFieldOverride = (fieldPath: string): OverrideStatus => {
      const globalFieldValue = get(globalValue, fieldPath);
      const cameraFieldValue = get(cameraValue, fieldPath);

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
        return get(globalValue, fieldPath);
      }
      return globalValue;
    };

    return {
      isOverridden,
      globalValue,
      cameraValue,
      getFieldOverride,
      resetToGlobal,
    };
  }, [config, cameraName, sectionPath]);
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
    const sectionsToCheck = [
      "detect",
      "record",
      "snapshots",
      "motion",
      "objects",
      "review",
      "audio",
      "notifications",
      "live",
      "timestamp_style",
    ];

    for (const section of sectionsToCheck) {
      const globalValue = get(config, section);
      const cameraValue = get(cameraConfig, section);

      if (!isEqual(globalValue, cameraValue)) {
        overriddenSections.push(section);
      }
    }

    return overriddenSections;
  }, [config, cameraName]);
}
