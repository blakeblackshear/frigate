// Hook to detect when camera config overrides global defaults
import { useMemo } from "react";
import useSWR from "swr";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import get from "lodash/get";
import set from "lodash/set";
import type { RJSFSchema } from "@rjsf/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { JsonObject, JsonValue } from "@/types/configForm";
import { isJsonObject } from "@/lib/utils";
import {
  buildHiddenFieldContext,
  getBaseCameraSectionValue,
  getEffectiveHiddenFields,
  pathMatchesHiddenPattern,
  unsetWithWildcard,
} from "@/utils/configUtil";
import { extractSectionSchema } from "@/hooks/use-config-schema";
import { applySchemaDefaults } from "@/lib/config-schema";

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

/**
 * Remove hidden-field paths from a value before comparison so fields the
 * user can't change in the UI (e.g. motion masks, attribute filters) don't
 * trigger override badges. Operates on a clone so the input is unchanged.
 */
function stripHiddenPaths(value: JsonValue, hiddenFields: string[]): JsonValue {
  if (hiddenFields.length === 0 || !isJsonObject(value)) return value;
  const cloned = cloneDeep(value) as JsonObject;
  for (const path of hiddenFields) {
    if (!path) continue;
    unsetWithWildcard(cloned as Record<string, unknown>, path);
  }
  return cloned;
}

/**
 * Field paths that the backend resolves per-camera at runtime (from `fps`,
 * stream introspection, or other camera-local state) but defaults to `None`
 * in the global Pydantic model. Because the `/config` endpoint serializes
 * with `exclude_none=True`, these paths are absent from the global section
 * yet always populated on cameras, which would otherwise make every camera
 * appear to override fields the user never set globally.
 */
const AUTO_DERIVED_FIELDS: Record<string, readonly string[]> = {
  detect: [
    "width",
    "height",
    "min_initialized",
    "max_disappeared",
    "stationary.interval",
    "stationary.threshold",
  ],
};

/**
 * Drop auto-derived field paths from the camera value when the global value
 * has no explicit setting for that path. If the user later sets one of these
 * fields globally, the path will be present in `globalValue` and normal
 * comparison resumes.
 */
function stripAutoDerivedMissingFromGlobal(
  sectionPath: string,
  globalValue: JsonValue,
  cameraValue: JsonValue,
): JsonValue {
  const fields = AUTO_DERIVED_FIELDS[sectionPath];
  if (!fields || !isJsonObject(cameraValue)) return cameraValue;
  const cloned = cloneDeep(cameraValue) as JsonObject;
  for (const path of fields) {
    if (get(globalValue, path) === undefined) {
      unsetWithWildcard(cloned as Record<string, unknown>, path);
    }
  }
  return cloned;
}

/**
 * Whether the given field is auto-derived for `sectionPath` and the global
 * value at that path is missing — in which case a per-camera value should
 * not be treated as an override.
 */
function isAutoDerivedMissingFromGlobal(
  sectionPath: string,
  fieldPath: string,
  globalValue: unknown,
): boolean {
  const fields = AUTO_DERIVED_FIELDS[sectionPath];
  if (!fields) return false;
  if (!fields.includes(fieldPath)) return false;
  const value = get(globalValue as JsonObject, fieldPath);
  return value === undefined || value === null;
}

/**
 * Collapse null and empty-object values for override comparisons so
 * semantically equivalent shapes match. The schema may default `mask: None`
 * while the runtime camera config carries `mask: {}` — both mean "no
 * masks", so collapsing them here keeps the equality check honest. We
 * keep this off the public `normalizeConfigValue` so save-flow code paths
 * (which serialize form data) aren't affected.
 **/
function collapseEmpty(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(collapseEmpty);
  }
  if (isJsonObject(value)) {
    const cleaned: JsonObject = {};
    for (const [key, val] of Object.entries(value as JsonObject)) {
      if (val === null || val === undefined) continue;
      const collapsed = collapseEmpty(val as JsonValue);
      if (
        isJsonObject(collapsed) &&
        Object.keys(collapsed as JsonObject).length === 0
      ) {
        continue;
      }
      cleaned[key] = collapsed;
    }
    return cleaned;
  }
  return value;
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
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");
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

    // Use the effective baseline (schema defaults when the global section
    // is unset, e.g. motion). Without this, sections omitted from the global
    // YAML would always read as "overridden" because the raw global value is
    // null while every camera has populated defaults.
    const normalizedGlobalValue = getEffectiveGlobalBaseline(
      config,
      sectionPath,
      compareFields,
      schema,
    );
    const normalizedCameraValue = normalizeConfigValue(cameraValue);

    // Collapse empty/null values for comparison so semantically equivalent
    // shapes (e.g. schema default `mask: null` vs runtime `mask: {}`) match.
    // Also strip hidden-field paths (motion masks, attribute filters, etc.)
    // so fields the user can't edit in the UI don't trigger override badges.
    const hiddenFields = getEffectiveHiddenFields(
      sectionPath,
      "camera",
      buildHiddenFieldContext(config, "camera", cameraName),
    );
    const collapsedGlobal = stripHiddenPaths(
      collapseEmpty(normalizedGlobalValue),
      hiddenFields,
    );
    const collapsedCameraRaw = stripHiddenPaths(
      collapseEmpty(normalizedCameraValue),
      hiddenFields,
    );
    const collapsedCamera = stripAutoDerivedMissingFromGlobal(
      sectionPath,
      collapsedGlobal,
      collapsedCameraRaw,
    );

    const comparisonGlobal = compareFields
      ? pickFields(collapsedGlobal, compareFields)
      : collapsedGlobal;
    const comparisonCamera = compareFields
      ? pickFields(collapsedCamera, compareFields)
      : collapsedCamera;

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

      if (
        isAutoDerivedMissingFromGlobal(
          sectionPath,
          fieldPath,
          normalizedGlobalValue,
        )
      ) {
        return {
          isOverridden: false,
          globalValue: globalFieldValue,
          cameraValue: cameraFieldValue,
        };
      }

      return {
        isOverridden: !isEqual(
          collapseEmpty(globalFieldValue as JsonValue),
          collapseEmpty(cameraFieldValue as JsonValue),
        ),
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
  }, [config, cameraName, sectionPath, compareFields, schema]);
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
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");
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
      const globalValue = getEffectiveGlobalBaseline(
        config,
        key,
        compareFields,
        schema,
      );
      const cameraValue = normalizeConfigValue(
        getBaseCameraSectionValue(config, cameraName, key),
      );

      const hiddenFields = getEffectiveHiddenFields(
        key,
        "camera",
        buildHiddenFieldContext(config, "camera", cameraName),
      );
      const collapsedGlobal = stripHiddenPaths(
        collapseEmpty(globalValue),
        hiddenFields,
      );
      const collapsedCameraRaw = stripHiddenPaths(
        collapseEmpty(cameraValue),
        hiddenFields,
      );
      const collapsedCamera = stripAutoDerivedMissingFromGlobal(
        key,
        collapsedGlobal,
        collapsedCameraRaw,
      );
      const comparisonGlobal = compareFields
        ? pickFields(collapsedGlobal, compareFields)
        : collapsedGlobal;
      const comparisonCamera = compareFields
        ? pickFields(collapsedCamera, compareFields)
        : collapsedCamera;

      if (
        compareFields && compareFields.length === 0
          ? false
          : !isEqual(comparisonGlobal, comparisonCamera)
      ) {
        overriddenSections.push(key);
      }
    }

    return overriddenSections;
  }, [config, cameraName, schema]);
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
 * Resolve the effective global baseline used for override comparisons.
 *
 * - When the global section is explicitly set, return it (normalized).
 * - Otherwise prefer the camera-level schema defaults so a camera that
 *   diverges from the implicit Pydantic default registers as overriding
 *   even with a single camera in the deployment. (Sections like `motion`
 *   are dumped with `exclude_unset=True`, so the API returns null whenever
 *   the user hasn't written the section globally.)
 * - Fall back to a modal-across-cameras synthetic baseline when the schema
 *   hasn't loaded yet or the section isn't in it.
 */
function getEffectiveGlobalBaseline(
  config: FrigateConfig,
  sectionPath: string,
  compareFields?: string[],
  schema?: RJSFSchema,
): JsonValue {
  const rawGlobalValue = get(config, sectionPath);
  if (rawGlobalValue != null) {
    return normalizeConfigValue(rawGlobalValue);
  }
  if (schema) {
    const sectionSchema = extractSectionSchema(schema, sectionPath, "camera");
    if (sectionSchema) {
      const defaults = applySchemaDefaults(sectionSchema, {});
      return normalizeConfigValue(defaults as JsonValue);
    }
  }
  const cameraSectionValues = Object.keys(config.cameras ?? {}).map((name) =>
    normalizeConfigValue(getBaseCameraSectionValue(config, name, sectionPath)),
  );
  return deriveSyntheticGlobalValue(cameraSectionValues, compareFields);
}

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
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");
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

    const globalValue = collapseEmpty(
      getEffectiveGlobalBaseline(config, sectionPath, compareFields, schema),
    );

    const entries: CameraOverrideEntry[] = [];
    for (let idx = 0; idx < cameraNames.length; idx += 1) {
      const cameraName = cameraNames[idx];
      const cameraConfig = config.cameras[cameraName];
      const deltasByPath = new Map<string, FieldDelta>();

      // 1. Camera-level overrides (uses base_config when a profile is active)
      const cameraValue = stripAutoDerivedMissingFromGlobal(
        sectionPath,
        globalValue,
        collapseEmpty(cameraSectionValues[idx]),
      );
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
  }, [config, sectionPath, schema]);
}

/**
 * Hook returning the field-level deltas between a single camera's base
 * (pre-profile) section value and the effective global baseline. Mirrors
 * `useConfigOverride`'s comparison logic but exposes per-field deltas so a
 * popover can list the overridden fields.
 *
 * @example
 * ```tsx
 * const deltas = useCameraSectionDeltas(config, "front_door", "detect");
 * // [{ fieldPath: "fps", globalValue: 5, cameraValue: 10 }]
 * ```
 */
export function useCameraSectionDeltas(
  config: FrigateConfig | undefined,
  cameraName: string | undefined,
  sectionPath: string,
): FieldDelta[] {
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");
  return useMemo(() => {
    if (!config?.cameras || !cameraName || !sectionPath) {
      return [];
    }
    const cameraConfig = config.cameras[cameraName];
    if (!cameraConfig) return [];

    const sectionMeta = OVERRIDABLE_SECTIONS.find((s) => s.key === sectionPath);
    const compareFields = sectionMeta?.compareFields;

    const globalValue = collapseEmpty(
      getEffectiveGlobalBaseline(config, sectionPath, compareFields, schema),
    );
    const cameraValue = stripAutoDerivedMissingFromGlobal(
      sectionPath,
      globalValue,
      collapseEmpty(
        normalizeConfigValue(
          getBaseCameraSectionValue(config, cameraName, sectionPath),
        ),
      ),
    );

    const hiddenFields = getEffectiveHiddenFields(
      sectionPath,
      "camera",
      buildHiddenFieldContext(config, "camera", cameraName),
    );

    const deltas: FieldDelta[] = [];
    for (const delta of collectFieldDeltas(
      globalValue,
      cameraValue,
      compareFields,
    )) {
      if (
        hiddenFields.some((pattern) =>
          pathMatchesHiddenPattern(delta.fieldPath, pattern),
        )
      ) {
        continue;
      }
      deltas.push(delta);
    }
    return deltas;
  }, [config, cameraName, sectionPath, schema]);
}

/**
 * Hook returning the field-level deltas between a single profile's overrides
 * and the camera's base (pre-profile) section value. Honors per-section
 * `compareFields` filters and hidden-field patterns so the result matches
 * what's actually exposed in the UI.
 *
 * @example
 * ```tsx
 * const deltas = useProfileSectionDeltas(config, "front_door", "night", "detect");
 * // [{ fieldPath: "fps", globalValue: 5, cameraValue: 10, profileName: "night" }]
 * ```
 */
export function useProfileSectionDeltas(
  config: FrigateConfig | undefined,
  cameraName: string | undefined,
  profileName: string | undefined,
  sectionPath: string,
): FieldDelta[] {
  return useMemo(() => {
    if (!config?.cameras || !cameraName || !profileName || !sectionPath) {
      return [];
    }
    const cameraConfig = config.cameras[cameraName];
    if (!cameraConfig) return [];

    const profileSection = (
      cameraConfig.profiles?.[profileName] as
        | Record<string, unknown>
        | undefined
    )?.[sectionPath];
    if (profileSection == null) return [];

    const sectionMeta = OVERRIDABLE_SECTIONS.find((s) => s.key === sectionPath);
    const compareFields = sectionMeta?.compareFields;

    const baseValue = collapseEmpty(
      normalizeConfigValue(
        getBaseCameraSectionValue(config, cameraName, sectionPath),
      ),
    );
    const profileValue = collapseEmpty(
      normalizeConfigValue(profileSection as JsonValue),
    );

    const hiddenFields = getEffectiveHiddenFields(
      sectionPath,
      "camera",
      buildHiddenFieldContext(config, "camera", cameraName),
    );

    const deltas: FieldDelta[] = [];
    for (const path of collectDefinedLeafPaths(profileValue)) {
      if (!isPathAllowed(path, compareFields)) continue;
      if (
        hiddenFields.some((pattern) => pathMatchesHiddenPattern(path, pattern))
      ) {
        continue;
      }
      const baseField = get(baseValue, path);
      const profileField = get(profileValue, path);
      if (!isEqual(baseField, profileField)) {
        deltas.push({
          fieldPath: path,
          globalValue: baseField,
          cameraValue: profileField,
          profileName,
        });
      }
    }
    return deltas;
  }, [config, cameraName, profileName, sectionPath]);
}
