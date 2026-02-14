// Shared config save utilities.
//
// Provides the core per-section save logic (buildOverrides, sanitize, restart
// detection, update-topic resolution) used by both the individual per-section
// Save button in BaseSection and the global "Save All" coordinator in Settings.

import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import unset from "lodash/unset";
import isEqual from "lodash/isEqual";
import mergeWith from "lodash/mergeWith";
import set from "lodash/set";
import { isJsonObject } from "@/lib/utils";
import { applySchemaDefaults } from "@/lib/config-schema";
import { normalizeConfigValue } from "@/hooks/use-config-override";
import {
  modifySchemaForSection,
  getEffectiveDefaultsForSection,
  sanitizeOverridesForSection,
} from "@/components/config-form/sections/section-special-cases";
import type { RJSFSchema } from "@rjsf/utils";
import type { FrigateConfig } from "@/types/frigateConfig";
import type {
  ConfigSectionData,
  JsonObject,
  JsonValue,
} from "@/types/configForm";
import type { SectionConfig } from "../components/config-form/sections/BaseSection";
import { sectionConfigs } from "../components/config-form/sectionConfigs";

// ---------------------------------------------------------------------------
// cameraUpdateTopicMap — maps config section paths to MQTT/WS update topics
// ---------------------------------------------------------------------------

export const cameraUpdateTopicMap: Record<string, string> = {
  detect: "detect",
  record: "record",
  snapshots: "snapshots",
  motion: "motion",
  objects: "objects",
  review: "review",
  audio: "audio",
  notifications: "notifications",
  live: "live",
  timestamp_style: "timestamp_style",
  audio_transcription: "audio_transcription",
  birdseye: "birdseye",
  face_recognition: "face_recognition",
  ffmpeg: "ffmpeg",
  lpr: "lpr",
  semantic_search: "semantic_search",
  mqtt: "mqtt",
  onvif: "onvif",
  ui: "ui",
};

// ---------------------------------------------------------------------------
// buildOverrides — pure recursive diff of current vs stored config & defaults
// ---------------------------------------------------------------------------

// Recursively compare `current` (pending form data) against `base` (persisted
// config) and `defaults` (schema defaults) to produce a minimal overrides
// payload.
//
// - Returns `undefined` when the value matches `base` (or `defaults` when
//   `base` is absent), indicating no override is needed.
// - For objects, recurses per-key; deleted keys (present in `base` but absent
//   in `current`) are represented as `""`.
// - For arrays, returns the full array when it differs.

export function buildOverrides(
  current: unknown,
  base: unknown,
  defaults: unknown,
): unknown | undefined {
  if (current === null || current === undefined || current === "") {
    return undefined;
  }

  if (Array.isArray(current)) {
    if (
      current.length === 0 &&
      (base === undefined || base === null) &&
      (defaults === undefined || defaults === null)
    ) {
      return undefined;
    }
    if (
      (base === undefined &&
        defaults !== undefined &&
        isEqual(current, defaults)) ||
      isEqual(current, base)
    ) {
      return undefined;
    }
    return current;
  }

  if (isJsonObject(current)) {
    const currentObj = current;
    const baseObj = isJsonObject(base) ? base : undefined;
    const defaultsObj = isJsonObject(defaults) ? defaults : undefined;

    const result: JsonObject = {};
    for (const [key, value] of Object.entries(currentObj)) {
      if (value === undefined && baseObj && baseObj[key] !== undefined) {
        result[key] = "";
        continue;
      }
      const overrideValue = buildOverrides(
        value,
        baseObj ? baseObj[key] : undefined,
        defaultsObj ? defaultsObj[key] : undefined,
      );
      if (overrideValue !== undefined) {
        result[key] = overrideValue as JsonValue;
      }
    }

    if (baseObj) {
      for (const [key, baseValue] of Object.entries(baseObj)) {
        if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
          continue;
        }
        if (baseValue === undefined) {
          continue;
        }
        result[key] = "";
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  if (
    base === undefined &&
    defaults !== undefined &&
    isEqual(current, defaults)
  ) {
    return undefined;
  }

  if (isEqual(current, base)) {
    return undefined;
  }

  return current;
}

// ---------------------------------------------------------------------------
// sanitizeSectionData — normalize config values and strip hidden fields
// ---------------------------------------------------------------------------

// Normalize raw config data (strip internal fields) and remove any paths
// listed in `hiddenFields` so they are not included in override computation.

export function sanitizeSectionData(
  data: ConfigSectionData,
  hiddenFields?: string[],
): ConfigSectionData {
  const normalized = normalizeConfigValue(data) as ConfigSectionData;
  if (!hiddenFields || hiddenFields.length === 0) {
    return normalized;
  }
  const cleaned = cloneDeep(normalized) as ConfigSectionData;
  hiddenFields.forEach((path) => {
    if (!path) return;
    unset(cleaned, path);
  });
  return cleaned;
}

// ---------------------------------------------------------------------------
// buildConfigDataForPath — convert dotted path to nested config_data payload
// ---------------------------------------------------------------------------

// Converts a dotted path (e.g. "cameras.front_door.detect") and a value into
// a properly nested config_data object (e.g. { cameras: { front_door: { detect: value } } }).
// This ensures the backend's flatten_config_data function can correctly distinguish
// between path separators (dots in the path) and literal dots in keys
// (e.g. "frigate.foo.bar" in logger.logs).
export function buildConfigDataForPath(
  path: string,
  value: unknown,
): Record<string, unknown> {
  const configData: Record<string, unknown> = {};
  set(configData, path, value);
  return configData;
}

// ---------------------------------------------------------------------------
// requiresRestartForOverrides — determine whether a restart is needed
// ---------------------------------------------------------------------------

// Check whether the given overrides include fields that require a Frigate
// restart.  When `restartRequired` is `undefined` the caller's default is
// used; an empty array means "never restart"; otherwise the function checks
// if any of the listed field paths are present in the overrides object.

function hasMatchAtPath(value: unknown, pathSegments: string[]): boolean {
  if (pathSegments.length === 0) {
    return value !== undefined;
  }

  if (value === undefined || value === null) {
    return false;
  }

  const [segment, ...rest] = pathSegments;

  if (segment === "*") {
    if (Array.isArray(value)) {
      return value.some((item) => hasMatchAtPath(item, rest));
    }

    if (isJsonObject(value)) {
      return Object.values(value).some((item) => hasMatchAtPath(item, rest));
    }

    return false;
  }

  if (Array.isArray(value)) {
    const index = Number(segment);
    if (!Number.isInteger(index)) {
      return false;
    }
    return hasMatchAtPath(value[index], rest);
  }

  if (isJsonObject(value)) {
    return hasMatchAtPath(value[segment], rest);
  }

  return false;
}

export function requiresRestartForOverrides(
  overrides: unknown,
  restartRequired: string[] | undefined,
  defaultRequiresRestart: boolean = true,
): boolean {
  if (restartRequired === undefined) {
    return defaultRequiresRestart;
  }
  if (restartRequired.length === 0) {
    return false;
  }
  if (!overrides || typeof overrides !== "object") {
    return false;
  }
  return restartRequired.some((path) => {
    if (!path) {
      return false;
    }

    if (!path.includes("*")) {
      return get(overrides as JsonObject, path) !== undefined;
    }

    return hasMatchAtPath(overrides, path.split("."));
  });
}

export function requiresRestartForFieldPath(
  fieldPath: Array<string | number>,
  restartRequired: string[] | undefined,
  defaultRequiresRestart: boolean = true,
): boolean {
  if (restartRequired === undefined) {
    return defaultRequiresRestart;
  }

  if (restartRequired.length === 0) {
    return false;
  }

  if (fieldPath.length === 0) {
    return false;
  }

  const probe: Record<string, unknown> = {};
  set(
    probe,
    fieldPath.map((segment) => String(segment)),
    true,
  );

  return requiresRestartForOverrides(
    probe,
    restartRequired,
    defaultRequiresRestart,
  );
}

// ---------------------------------------------------------------------------
// SectionSavePayload — data produced by prepareSectionSavePayload
// ---------------------------------------------------------------------------

// Ready-to-PUT payload for a single config section.

export interface SectionSavePayload {
  basePath: string;
  sanitizedOverrides: Record<string, unknown>;
  updateTopic: string | undefined;
  needsRestart: boolean;
  pendingDataKey: string;
}

// ---------------------------------------------------------------------------
// extractSectionSchema — resolve a section schema from the full config schema
// ---------------------------------------------------------------------------

import { resolveAndCleanSchema } from "@/lib/config-schema";

type SchemaWithDefinitions = RJSFSchema & {
  $defs?: Record<string, RJSFSchema>;
  definitions?: Record<string, RJSFSchema>;
  properties?: Record<string, RJSFSchema>;
};

function getSchemaDefinitions(schema: RJSFSchema): Record<string, RJSFSchema> {
  return (
    (schema as SchemaWithDefinitions).$defs ||
    (schema as SchemaWithDefinitions).definitions ||
    {}
  );
}

function extractSectionSchema(
  schema: RJSFSchema,
  sectionPath: string,
  level: "global" | "camera",
): RJSFSchema | null {
  const defs = getSchemaDefinitions(schema);
  const schemaObj = schema as SchemaWithDefinitions;
  let sectionDef: RJSFSchema | null = null;

  if (level === "camera") {
    const cameraConfigDef = defs.CameraConfig;
    if (cameraConfigDef?.properties) {
      const sectionProp = cameraConfigDef.properties[sectionPath];
      if (sectionProp && typeof sectionProp === "object") {
        if ("$ref" in sectionProp && typeof sectionProp.$ref === "string") {
          const refPath = sectionProp.$ref
            .replace(/^#\/\$defs\//, "")
            .replace(/^#\/definitions\//, "");
          sectionDef = defs[refPath] || null;
        } else {
          sectionDef = sectionProp;
        }
      }
    }
  } else {
    if (schemaObj.properties) {
      const sectionProp = schemaObj.properties[sectionPath];
      if (sectionProp && typeof sectionProp === "object") {
        if ("$ref" in sectionProp && typeof sectionProp.$ref === "string") {
          const refPath = sectionProp.$ref
            .replace(/^#\/\$defs\//, "")
            .replace(/^#\/definitions\//, "");
          sectionDef = defs[refPath] || null;
        } else {
          sectionDef = sectionProp;
        }
      }
    }
  }

  if (!sectionDef) return null;

  const schemaWithDefs: RJSFSchema = { ...sectionDef, $defs: defs };
  return resolveAndCleanSchema(schemaWithDefs);
}

// ---------------------------------------------------------------------------
// prepareSectionSavePayload — build the PUT payload for a single section
// ---------------------------------------------------------------------------

// Given a pending-data key (e.g. `"detect"` or `"front_door::detect"`), its
// dirty form data, the current stored config, and the full JSON Schema,
// produce a `SectionSavePayload` that can be sent directly to
// `PUT config/set`.  Returns `null` when there are no effective overrides.

export function prepareSectionSavePayload(opts: {
  pendingDataKey: string;
  pendingData: unknown;
  config: FrigateConfig;
  fullSchema: RJSFSchema;
}): SectionSavePayload | null {
  const { pendingDataKey, pendingData, config, fullSchema } = opts;

  if (!pendingData) return null;

  // Parse pendingDataKey → sectionPath, level, cameraName
  let sectionPath: string;
  let level: "global" | "camera";
  let cameraName: string | undefined;

  if (pendingDataKey.includes("::")) {
    const idx = pendingDataKey.indexOf("::");
    cameraName = pendingDataKey.slice(0, idx);
    sectionPath = pendingDataKey.slice(idx + 2);
    level = "camera";
  } else {
    sectionPath = pendingDataKey;
    level = "global";
  }

  // Resolve section config
  const sectionConfig = getSectionConfig(sectionPath, level);

  // Resolve section schema
  const sectionSchema = extractSectionSchema(fullSchema, sectionPath, level);
  if (!sectionSchema) return null;

  const modifiedSchema = modifySchemaForSection(
    sectionPath,
    level,
    sectionSchema,
  );

  // Compute rawFormData (the current stored value for this section)
  let rawSectionValue: unknown;
  if (level === "camera" && cameraName) {
    rawSectionValue = get(config.cameras?.[cameraName], sectionPath);
  } else {
    rawSectionValue = get(config, sectionPath);
  }
  const rawFormData =
    rawSectionValue === undefined || rawSectionValue === null
      ? {}
      : rawSectionValue;

  // Sanitize raw form data
  const rawData = sanitizeSectionData(
    rawFormData as ConfigSectionData,
    sectionConfig.hiddenFields,
  );

  // Compute schema defaults
  const schemaDefaults = modifiedSchema
    ? applySchemaDefaults(modifiedSchema, {})
    : {};
  const effectiveDefaults = getEffectiveDefaultsForSection(
    sectionPath,
    level,
    modifiedSchema ?? undefined,
    schemaDefaults,
  );

  // Build overrides
  const overrides = buildOverrides(pendingData, rawData, effectiveDefaults);
  const sanitizedOverrides = sanitizeOverridesForSection(
    sectionPath,
    level,
    overrides,
  );

  if (
    !sanitizedOverrides ||
    typeof sanitizedOverrides !== "object" ||
    Object.keys(sanitizedOverrides as Record<string, unknown>).length === 0
  ) {
    return null;
  }

  // Compute basePath
  const basePath =
    level === "camera" && cameraName
      ? `cameras.${cameraName}.${sectionPath}`
      : sectionPath;

  // Compute updateTopic
  let updateTopic: string | undefined;
  if (level === "camera" && cameraName) {
    const topic = cameraUpdateTopicMap[sectionPath];
    updateTopic = topic ? `config/cameras/${cameraName}/${topic}` : undefined;
  } else {
    updateTopic = `config/${sectionPath}`;
  }

  // Restart detection
  const needsRestart = requiresRestartForOverrides(
    sanitizedOverrides,
    sectionConfig.restartRequired,
    true,
  );

  return {
    basePath,
    sanitizedOverrides: sanitizedOverrides as Record<string, unknown>,
    updateTopic,
    needsRestart,
    pendingDataKey,
  };
}

const mergeSectionConfig = (
  base: SectionConfig | undefined,
  overrides: Partial<SectionConfig> | undefined,
): SectionConfig =>
  mergeWith({}, base ?? {}, overrides ?? {}, (objValue, srcValue, key) => {
    if (Array.isArray(objValue) || Array.isArray(srcValue)) {
      return srcValue ?? objValue;
    }

    if (key === "uiSchema" && srcValue !== undefined) {
      return srcValue;
    }

    return undefined;
  });

export function getSectionConfig(
  sectionKey: string,
  level: "global" | "camera",
): SectionConfig {
  const entry = sectionConfigs[sectionKey];
  if (!entry) {
    return {};
  }

  const overrides = level === "global" ? entry.global : entry.camera;
  return mergeSectionConfig(entry.base, overrides);
}
