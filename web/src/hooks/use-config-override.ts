// Hook to detect when camera config overrides global defaults
import { useMemo } from "react";
import isEqual from "lodash/isEqual";
import get from "lodash/get";
import set from "lodash/set";
import { FrigateConfig } from "@/types/frigateConfig";
import { JsonObject, JsonValue } from "@/types/configForm";
import { isJsonObject } from "@/lib/utils";
import { getBaseCameraSectionValue } from "@/utils/configUtil";

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

    // Prefer the base (pre-profile) value so that override detection and
    // widget context reflect the camera's own config, not profile effects.
    const cameraValue = getBaseCameraSectionValue(
      config,
      cameraName,
      sectionPath,
    );

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
 * Sections that can be overridden per-camera, with optional compareFields
 * filters that scope the override comparison to a subset of fields.
 */
export const OVERRIDABLE_SECTIONS: ReadonlyArray<{
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

    for (const { key, compareFields } of OVERRIDABLE_SECTIONS) {
      const globalValue = normalizeConfigValue(get(config, key));
      const cameraValue = normalizeConfigValue(
        getBaseCameraSectionValue(config, cameraName, key),
      );

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

export interface FieldDelta {
  /** Path relative to the section (e.g. "genai.enabled") */
  fieldPath: string;
  globalValue: unknown;
  cameraValue: unknown;
  /** Profile name when the override originates from a profile; undefined for camera-level overrides */
  profileName?: string;
}

export interface CameraOverrideEntry {
  camera: string;
  fieldDeltas: FieldDelta[];
}

/**
 * Collect leaf-level field differences between a global section value
 * and a camera section value. When compareFields is provided, only those
 * paths are compared; otherwise the objects are walked recursively.
 */
function collectFieldDeltas(
  globalValue: JsonValue,
  cameraValue: JsonValue,
  compareFields?: string[],
  pathPrefix = "",
): FieldDelta[] {
  if (compareFields) {
    if (compareFields.length === 0) {
      return [];
    }
    const deltas: FieldDelta[] = [];
    for (const path of compareFields) {
      const g = get(globalValue, path);
      const c = get(cameraValue, path);
      if (!isEqual(g, c)) {
        deltas.push({ fieldPath: path, globalValue: g, cameraValue: c });
      }
    }
    return deltas;
  }

  if (isJsonObject(globalValue) && isJsonObject(cameraValue)) {
    const deltas: FieldDelta[] = [];
    const keys = new Set([
      ...Object.keys(globalValue),
      ...Object.keys(cameraValue),
    ]);
    for (const key of keys) {
      const g = (globalValue as JsonObject)[key];
      const c = (cameraValue as JsonObject)[key];
      if (isEqual(g, c)) continue;
      const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      if (isJsonObject(g) && isJsonObject(c)) {
        deltas.push(...collectFieldDeltas(g, c, undefined, childPath));
      } else {
        deltas.push({ fieldPath: childPath, globalValue: g, cameraValue: c });
      }
    }
    return deltas;
  }

  if (!isEqual(globalValue, cameraValue)) {
    return [{ fieldPath: pathPrefix, globalValue, cameraValue }];
  }
  return [];
}

/**
 * Walk a partial config object and return the dot-paths of every leaf value
 * (primitive or array) actually defined on it. Used to limit profile-vs-global
 * diffs to keys the profile actually sets, avoiding false "undefined" deltas
 * for fields the profile leaves unspecified.
 */
function collectDefinedLeafPaths(value: JsonValue, prefix = ""): string[] {
  if (!isJsonObject(value)) {
    return prefix ? [prefix] : [];
  }
  const paths: string[] = [];
  for (const [key, val] of Object.entries(value as JsonObject)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (isJsonObject(val)) {
      paths.push(...collectDefinedLeafPaths(val as JsonValue, childPath));
    } else {
      paths.push(childPath);
    }
  }
  return paths;
}

function isPathAllowed(path: string, compareFields?: string[]): boolean {
  if (!compareFields) return true;
  return compareFields.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}.`),
  );
}

/**
 * Some Frigate sections (notably `motion`) are dumped by the backend with
 * `exclude_unset=True`, so when the user hasn't explicitly written the section
 * in their global YAML the API returns null even though every camera still
 * gets defaults applied at runtime. To still detect cross-camera differences
 * in those sections we synthesize a baseline by taking the modal (most common)
 * value at each leaf path across cameras — cameras whose value diverges from
 * the modal are treated as overriding.
 */
function deriveSyntheticGlobalValue(
  cameraSectionValues: JsonValue[],
  compareFields?: string[],
): JsonObject {
  const cameras = cameraSectionValues.filter(isJsonObject) as JsonObject[];
  if (cameras.length === 0) return {};

  const allPaths = new Set<string>();
  for (const cam of cameras) {
    for (const path of collectDefinedLeafPaths(cam as JsonValue)) {
      if (!isPathAllowed(path, compareFields)) continue;
      allPaths.add(path);
    }
  }

  const baseline: JsonObject = {};
  for (const path of allPaths) {
    const counts = new Map<string, { value: unknown; count: number }>();
    for (const cam of cameras) {
      const v = get(cam, path);
      const key = JSON.stringify(v ?? null);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { value: v, count: 1 });
      }
    }
    let modal: { value: unknown; count: number } | undefined;
    for (const entry of counts.values()) {
      if (!modal || entry.count > modal.count) modal = entry;
    }
    if (modal) {
      set(baseline, path, modal.value);
    }
  }
  return baseline;
}

/**
 * Paths that are intentionally hidden from the cross-camera override summary
 * because they're inherently per-camera (mask polygons, zone definitions) and
 * would otherwise dominate the popover with noise. Excludes any path where
 * `mask` appears as a path segment, so nested keys under a mask dict (e.g.
 * `mask.global_object_mask_1.coordinates`) are also filtered.
 */
function isCrossCameraIgnoredPath(path: string): boolean {
  if (!path) return false;
  return path.split(".").includes("mask");
}

/**
 * Hook to find every camera that overrides a given global section. Returns
 * one entry per overriding camera with the specific field-level deltas.
 * Considers both the camera's own (pre-profile) section value and any of its
 * defined profiles, so a field overridden only inside a profile still surfaces.
 *
 * @example
 * ```tsx
 * const entries = useCamerasOverridingSection(config, "review");
 * // [{ camera: "front_door", fieldDeltas: [{ fieldPath: "genai.enabled", ... }] }]
 * ```
 */
export function useCamerasOverridingSection(
  config: FrigateConfig | undefined,
  sectionPath: string,
): CameraOverrideEntry[] {
  return useMemo(() => {
    if (!config?.cameras || !sectionPath) {
      return [];
    }

    const sectionMeta = OVERRIDABLE_SECTIONS.find((s) => s.key === sectionPath);
    const compareFields = sectionMeta?.compareFields;

    const cameraNames = Object.keys(config.cameras);
    const cameraSectionValues = cameraNames.map((name) =>
      normalizeConfigValue(
        getBaseCameraSectionValue(config, name, sectionPath),
      ),
    );

    const rawGlobalValue = get(config, sectionPath);
    const globalValue: JsonValue =
      rawGlobalValue == null
        ? deriveSyntheticGlobalValue(cameraSectionValues, compareFields)
        : normalizeConfigValue(rawGlobalValue);

    const entries: CameraOverrideEntry[] = [];
    for (let idx = 0; idx < cameraNames.length; idx += 1) {
      const cameraName = cameraNames[idx];
      const cameraConfig = config.cameras[cameraName];
      const deltasByPath = new Map<string, FieldDelta>();

      // 1. Camera-level overrides (uses base_config when a profile is active)
      const cameraValue = cameraSectionValues[idx];
      for (const delta of collectFieldDeltas(
        globalValue,
        cameraValue,
        compareFields,
      )) {
        if (isCrossCameraIgnoredPath(delta.fieldPath)) continue;
        deltasByPath.set(delta.fieldPath, delta);
      }

      // 2. Profile-level overrides — diff only the paths each profile actually
      // defines, so unspecified-in-profile fields don't register as deltas.
      const profiles = cameraConfig?.profiles ?? {};
      for (const profileName of Object.keys(profiles)) {
        const profileSection = (
          profiles[profileName] as Record<string, unknown> | undefined
        )?.[sectionPath];
        if (profileSection === undefined) continue;
        const normalizedProfile = normalizeConfigValue(
          profileSection as JsonValue,
        );
        for (const path of collectDefinedLeafPaths(normalizedProfile)) {
          if (deltasByPath.has(path)) continue;
          if (isCrossCameraIgnoredPath(path)) continue;
          if (!isPathAllowed(path, compareFields)) continue;
          const g = get(globalValue, path);
          const p = get(normalizedProfile, path);
          if (!isEqual(g, p)) {
            deltasByPath.set(path, {
              fieldPath: path,
              globalValue: g,
              cameraValue: p,
              profileName,
            });
          }
        }
      }

      if (deltasByPath.size > 0) {
        entries.push({
          camera: cameraName,
          fieldDeltas: Array.from(deltasByPath.values()),
        });
      }
    }

    return entries;
  }, [config, sectionPath]);
}
