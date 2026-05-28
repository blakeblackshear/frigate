import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import merge from "lodash/merge";
import type { RJSFSchema } from "@rjsf/utils";

import {
  buildOverrides,
  cameraUpdateTopicMap,
  flattenOverrides,
  getEffectiveAttributeLabels,
  getSectionConfig,
  prepareSectionSavePayload,
  resolveHiddenFieldEntries,
  sanitizeSectionData,
  type SectionSavePayload,
} from "@/utils/configUtil";
import { applySchemaDefaults } from "@/lib/config-schema";
import type { SaveAllPreviewItem } from "@/components/overlay/detail/SaveAllPreviewPopover";
import type { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import type {
  ConfigSectionData,
  JsonObject,
  JsonValue,
} from "@/types/configForm";
import { processCameraName } from "@/utils/cameraUtil";

/**
 * Sections whose `filters` dict is auto-populated by the backend at parse
 * time. `attributeBump` reflects the global-level `min_score=0.7` override
 * the backend applies to attribute labels (face, license_plate, Frigate+
 * couriers) — see `frigate/config/config.py`.
 */
const FILTER_SECTION_DEFS: Record<
  string,
  {
    listField: string;
    filterDef: string;
    attributeBump?: { min_score: number };
  }
> = {
  objects: {
    listField: "track",
    filterDef: "FilterConfig",
    attributeBump: { min_score: 0.7 },
  },
  audio: { listField: "listen", filterDef: "AudioFilterConfig" },
};

function resolveDef(schema: RJSFSchema, name: string): RJSFSchema | undefined {
  const defs =
    (schema as { $defs?: Record<string, RJSFSchema> }).$defs ??
    (schema as { definitions?: Record<string, RJSFSchema> }).definitions;
  return defs ? defs[name] : undefined;
}

/** Remove filter entries that exactly match the backend's auto-default. */
function stripAutoDefaultFilters(
  section: string,
  sourceSection: JsonObject,
  fullSchema: RJSFSchema,
  fullConfig: FrigateConfig,
  fullCameraConfig: CameraConfig,
): JsonObject {
  const def = FILTER_SECTION_DEFS[section];
  if (!def) return sourceSection;
  const filters = sourceSection.filters;
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return sourceSection;
  }
  const filterDef = resolveDef(fullSchema, def.filterDef);
  if (!filterDef) return sourceSection;
  const baseDefaults = applySchemaDefaults(filterDef, {}) as JsonObject;
  const attributeDefaults = def.attributeBump
    ? ({ ...baseDefaults, ...def.attributeBump } as JsonObject)
    : baseDefaults;
  const attributeSet =
    section === "objects"
      ? new Set(
          getEffectiveAttributeLabels(fullConfig, fullCameraConfig, "camera"),
        )
      : new Set<string>();

  const cleaned: JsonObject = {};
  for (const [label, value] of Object.entries(filters as JsonObject)) {
    const expected = attributeSet.has(label) ? attributeDefaults : baseDefaults;
    if (isEqual(value, expected)) continue;
    cleaned[label] = value as JsonValue;
  }
  return { ...sourceSection, filters: cleaned };
}

/**
 * Strip named runtime-only fields from each entry in a dict-of-objects
 * (mask `enabled_in_config`/`raw_coordinates`, zone `color`). The settings
 * UI doesn't need this because BaseSection's form never exposes these
 * sub-collections; we do because clone re-injects them from the API.
 */
function stripDictEntryFields(
  dict: unknown,
  fieldsToStrip: readonly string[],
): unknown {
  if (!dict || typeof dict !== "object" || Array.isArray(dict)) return dict;
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(dict as JsonObject)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const cleaned = { ...(value as JsonObject) };
      for (const field of fieldsToStrip) {
        delete cleaned[field];
      }
      result[key] = cleaned as JsonValue;
    } else {
      result[key] = value as JsonValue;
    }
  }
  return result;
}

/**
 * Drop `""` (Reset) markers — meaningless for a new camera and unsafe
 * (backend `update_yaml` raises KeyError trying to `del` a missing key).
 */
function stripResetMarkers(
  value: JsonValue | undefined,
): JsonValue | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const result: JsonObject = {};
  for (const [key, child] of Object.entries(value as JsonObject)) {
    const cleaned = stripResetMarkers(child);
    if (cleaned !== undefined) result[key] = cleaned;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Collapse per-section payloads into one camera-level payload + `…/add`
 * topic. New cameras are created atomically by the backend's `add`
 * handler, so a single PUT avoids the intermediate-validation ordering
 * problem (e.g. a `review` required_zone referencing zones not yet written)
 * that the per-section path is subject to.
 */
function bundleNewCameraPayload(
  payloads: SectionSavePayload[],
  target: string,
): SectionSavePayload {
  const prefix = `cameras.${target}`;
  const camera: JsonObject = {};
  for (const p of payloads) {
    if (p.basePath === prefix) {
      merge(camera, p.sanitizedOverrides);
    } else if (p.basePath.startsWith(`${prefix}.`)) {
      merge(camera, {
        [p.basePath.slice(prefix.length + 1)]: p.sanitizedOverrides,
      });
    }
  }
  return {
    basePath: prefix,
    sanitizedOverrides: camera,
    updateTopic: `config/cameras/${target}/add`,
    needsRestart: true,
    pendingDataKey: `${target}::add`,
  };
}

/**
 * Drop empty `*_args` arrays from ffmpeg inputs. Mirrors
 * `sanitizeOverridesForSection`'s ffmpeg cleanup, which we don't go
 * through here because the establishing payload uses `buildOverrides`
 * directly.
 */
function cleanupFfmpegInputArgs(
  ffmpeg: JsonValue | undefined,
): JsonValue | undefined {
  if (!ffmpeg || typeof ffmpeg !== "object" || Array.isArray(ffmpeg)) {
    return ffmpeg;
  }
  const obj = ffmpeg as JsonObject;
  const inputs = obj.inputs;
  if (!Array.isArray(inputs)) return ffmpeg;
  const cleanedInputs = inputs.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input))
      return input;
    const cleaned = { ...(input as JsonObject) };
    for (const argsKey of ["global_args", "hwaccel_args", "input_args"]) {
      const v = cleaned[argsKey];
      if (Array.isArray(v) && v.length === 0) delete cleaned[argsKey];
    }
    return cleaned as JsonValue;
  });
  return { ...obj, inputs: cleanedInputs as JsonValue };
}

/** Subset of `/api/config/raw_paths` used to unmask source credentials. */
export type RawCameraPaths = {
  cameras?: Record<
    string,
    { ffmpeg?: { inputs?: Array<{ path?: string; roles?: string[] }> } }
  >;
};

/**
 * Replace each ffmpeg input's `path` with the unmasked value from
 * `rawInputs` at the same index. Mirrors `_restore_masked_camera_paths`.
 */
function restoreFfmpegPaths(
  ffmpeg: unknown,
  rawInputs: Array<{ path?: string }> | undefined,
): unknown {
  if (!ffmpeg || typeof ffmpeg !== "object" || Array.isArray(ffmpeg)) {
    return ffmpeg;
  }
  const obj = cloneDeep(ffmpeg) as JsonObject;
  const inputs = obj.inputs;
  if (!Array.isArray(inputs) || !rawInputs) return obj;
  inputs.forEach((input, i) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return;
    const rawPath = rawInputs[i]?.path;
    if (typeof rawPath !== "string") return;
    (input as JsonObject).path = rawPath;
  });
  return obj;
}

/**
 * Replay the backend's per-camera detect-field formulas (`frigate/config/
 * config.py`) on the synthetic side so they cancel out of the diff. The
 * global config doesn't get per-camera derivation, so without this the
 * source's computed values surface as overrides.
 */
function applyDetectComputedDefaults(
  detect: JsonObject,
  fpsOverride?: number,
): JsonObject {
  const result = { ...detect };
  const fps =
    typeof fpsOverride === "number"
      ? fpsOverride
      : typeof result.fps === "number"
        ? result.fps
        : 5;
  if (result.min_initialized == null) {
    result.min_initialized = Math.max(Math.floor(fps / 2), 2);
  }
  if (result.max_disappeared == null) {
    result.max_disappeared = fps * 5;
  }
  const threshold = fps * 10;
  const stationary = result.stationary;
  const stat: JsonObject =
    stationary && typeof stationary === "object" && !Array.isArray(stationary)
      ? { ...(stationary as JsonObject) }
      : {};
  if (stat.threshold == null) stat.threshold = threshold;
  if (stat.interval == null) stat.interval = threshold;
  result.stationary = stat as JsonValue;
  return result;
}

/**
 * Categories the dialog exposes. Most map 1:1 to a section config and flow
 * through `prepareSectionSavePayload`. Special cases:
 *   - `motion_mask`/`object_masks`: carve-outs merged into the parent
 *     section's payload, or emitted standalone if the parent is unselected.
 *   - `ffmpeg_live`: new-camera target only.
 *   - `type`/`profiles`: not schema-driven; built directly below.
 */
export type CloneCategoryKey =
  | "record"
  | "snapshots"
  | "review"
  | "motion"
  | "objects"
  | "audio"
  | "audio_transcription"
  | "notifications"
  | "birdseye"
  | "mqtt"
  | "timestamp_style"
  | "onvif"
  | "lpr"
  | "face_recognition"
  | "semantic_search"
  | "genai"
  | "type"
  | "profiles"
  | "detect"
  | "zones"
  | "motion_mask"
  | "object_masks"
  | "ffmpeg_live";

export type CloneCategoryGroup = "general" | "spatial" | "streams";

export type CloneCategory = {
  key: CloneCategoryKey;
  group: CloneCategoryGroup;
  /** True when this category is only valid for "new camera" targets. */
  newCameraOnly?: boolean;
  /** True when this category is forced selected for new-camera targets. */
  forcedForNewCamera?: boolean;
  /** Default selection state for "existing camera" targets when resolutions match. */
  defaultOnExisting: boolean;
};

export const CLONE_CATEGORIES: readonly CloneCategory[] = [
  // General
  { key: "record", group: "general", defaultOnExisting: true },
  { key: "snapshots", group: "general", defaultOnExisting: true },
  { key: "review", group: "general", defaultOnExisting: true },
  { key: "motion", group: "general", defaultOnExisting: true },
  { key: "objects", group: "general", defaultOnExisting: true },
  { key: "audio", group: "general", defaultOnExisting: true },
  { key: "audio_transcription", group: "general", defaultOnExisting: true },
  { key: "notifications", group: "general", defaultOnExisting: true },
  { key: "birdseye", group: "general", defaultOnExisting: true },
  { key: "mqtt", group: "general", defaultOnExisting: true },
  { key: "timestamp_style", group: "general", defaultOnExisting: true },
  { key: "onvif", group: "general", defaultOnExisting: false },
  { key: "lpr", group: "general", defaultOnExisting: true },
  { key: "face_recognition", group: "general", defaultOnExisting: true },
  { key: "semantic_search", group: "general", defaultOnExisting: true },
  { key: "genai", group: "general", defaultOnExisting: true },
  { key: "type", group: "general", defaultOnExisting: false },
  { key: "profiles", group: "general", defaultOnExisting: true },
  // Spatial — defaults computed via resolutionsMatch()
  { key: "detect", group: "spatial", defaultOnExisting: true },
  { key: "zones", group: "spatial", defaultOnExisting: true },
  { key: "motion_mask", group: "spatial", defaultOnExisting: true },
  { key: "object_masks", group: "spatial", defaultOnExisting: true },
  // Streams — only for new-camera target, forced on
  {
    key: "ffmpeg_live",
    group: "streams",
    newCameraOnly: true,
    forcedForNewCamera: true,
    defaultOnExisting: false,
  },
] as const;

/**
 * Exact-match detect dimensions. Aspect-ratio tolerance isn't safe because
 * zone/mask coords may be stored as explicit pixels, not just 0-1 relative.
 */
export function resolutionsMatch(
  srcDetect: CameraConfig["detect"] | undefined,
  dstDetect: CameraConfig["detect"] | undefined,
): boolean {
  if (!srcDetect || !dstDetect) return false;
  if (
    typeof srcDetect.width !== "number" ||
    typeof srcDetect.height !== "number"
  ) {
    return false;
  }
  if (
    typeof dstDetect.width !== "number" ||
    typeof dstDetect.height !== "number"
  ) {
    return false;
  }
  return (
    srcDetect.width === dstDetect.width && srcDetect.height === dstDetect.height
  );
}

/**
 * Initial selection set. Existing-camera targets start empty — copying onto
 * a configured camera is destructive, so the user opts in explicitly.
 * New-camera targets pre-select `defaultOnExisting` categories plus
 * `forcedForNewCamera`.
 */
export function getCategoryDefaults(
  targetIsNew: boolean,
): Set<CloneCategoryKey> {
  const selected = new Set<CloneCategoryKey>();
  if (!targetIsNew) return selected;
  for (const cat of CLONE_CATEGORIES) {
    if (cat.forcedForNewCamera || cat.defaultOnExisting) selected.add(cat.key);
  }
  return selected;
}

type BuildClonedPayloadsArgs = {
  sourceCfg: CameraConfig;
  sourceName: string;
  /** Raw user input for new camera, or the existing-camera key. */
  targetInput: string;
  targetIsNew: boolean;
  selectedKeys: Set<CloneCategoryKey>;
  fullConfig: FrigateConfig;
  fullSchema: RJSFSchema;
  rawPaths?: RawCameraPaths;
};

/**
 * Build the ordered payloads to PUT. Order: new-camera `…/add`, then
 * `type` (LPR vs normal affects attribute resolution for later payloads),
 * then per-section, then `profiles` (no hot-reload topic).
 */
export function buildClonedCameraPayloads({
  sourceCfg,
  sourceName,
  targetInput,
  targetIsNew,
  selectedKeys,
  fullConfig,
  fullSchema,
  rawPaths,
}: BuildClonedPayloadsArgs): SectionSavePayload[] {
  const payloads: SectionSavePayload[] = [];

  const { finalCameraName: target, friendlyName } = targetIsNew
    ? processCameraName(targetInput)
    : { finalCameraName: targetInput, friendlyName: undefined };

  // New-camera establishing payload (carries the `…/add` topic).
  if (targetIsNew) {
    const addOverrides: Record<string, unknown> = {
      enabled: true,
    };
    if (friendlyName) {
      addOverrides.friendly_name = friendlyName;
    }
    // Diff ffmpeg/live against the global config so fields matching
    // inherited defaults drop out. Required fields (ffmpeg.inputs) come
    // along because the source differs from global there.
    if (selectedKeys.has("ffmpeg_live") && sourceCfg.ffmpeg) {
      // /api/config masks `user:pass` as `*:*`; backend's restoration
      // only handles existing cameras, so we unmask here for new ones.
      const ffmpegWithRealPaths = restoreFfmpegPaths(
        sourceCfg.ffmpeg,
        rawPaths?.cameras?.[sourceName]?.ffmpeg?.inputs,
      );
      const diff = buildOverrides(
        ffmpegWithRealPaths,
        undefined,
        fullConfig.ffmpeg,
      );
      const cleaned = cleanupFfmpegInputArgs(diff as JsonValue | undefined);
      if (cleaned !== undefined) addOverrides.ffmpeg = cleaned;
    }
    if (selectedKeys.has("ffmpeg_live") && sourceCfg.live) {
      const diff = buildOverrides(
        sourceCfg.live,
        undefined,
        (fullConfig as unknown as JsonObject).live,
      );
      if (diff !== undefined) addOverrides.live = diff;
    }
    payloads.push({
      basePath: `cameras.${target}`,
      sanitizedOverrides: addOverrides as JsonObject,
      updateTopic: `config/cameras/${target}/add`,
      needsRestart: true,
      pendingDataKey: `${target}::__add__`,
    });
  }

  // Camera type — top-level scalar, no schema-driven section.
  if (selectedKeys.has("type")) {
    const srcType = (sourceCfg as { type?: string | null }).type;
    if (srcType !== undefined && srcType !== null) {
      payloads.push({
        basePath: `cameras.${target}`,
        sanitizedOverrides: { type: srcType },
        updateTopic: undefined,
        needsRestart: true,
        pendingDataKey: `${target}::type`,
      });
    }
  }

  // Section-backed categories — flow through prepareSectionSavePayload
  // for matching restart/update-topic behavior. Order matters for the
  // existing-camera multi-PUT path: each PUT re-validates the whole
  // config, so dependency providers must precede consumers — `detect`
  // (resolution) then `zones` before sections that reference zones via
  // `required_zones` (review, objects, snapshots, mqtt).
  const SECTION_KEYS: Array<{ key: CloneCategoryKey; section: string }> = [
    { key: "detect", section: "detect" },
    { key: "zones", section: "zones" },
    { key: "motion", section: "motion" },
    { key: "objects", section: "objects" },
    { key: "record", section: "record" },
    { key: "snapshots", section: "snapshots" },
    { key: "review", section: "review" },
    { key: "audio", section: "audio" },
    { key: "audio_transcription", section: "audio_transcription" },
    { key: "notifications", section: "notifications" },
    { key: "birdseye", section: "birdseye" },
    { key: "mqtt", section: "mqtt" },
    { key: "timestamp_style", section: "timestamp_style" },
    { key: "onvif", section: "onvif" },
    { key: "lpr", section: "lpr" },
    { key: "face_recognition", section: "face_recognition" },
    { key: "semantic_search", section: "semantic_search" },
    { key: "genai", section: "genai" },
  ];

  // Synthetic target so we can reuse prepareSectionSavePayload unchanged.
  // For new-camera target, seed sections where camera schema accepts all
  // global fields — gives buildOverrides the right inheritance baseline.
  // Sections with divergent per-camera Pydantic classes (mqtt, birdseye,
  // lpr, face_recognition, semantic_search, audio_transcription, genai)
  // are left unset so prepareSectionSavePayload's schema defaults handle
  // filtering instead — seeding from global would emit its extra fields
  // as Reset markers.
  const GLOBAL_INHERITED_SECTIONS = [
    "detect",
    "objects",
    "motion",
    "record",
    "snapshots",
    "review",
    "audio",
    "notifications",
    "ffmpeg",
    "live",
    "timestamp_style",
  ];
  const syntheticTargetCamera = targetIsNew
    ? ({
        enabled: true,
        ...Object.fromEntries(
          GLOBAL_INHERITED_SECTIONS.map((s) => [
            s,
            cloneDeep((fullConfig as unknown as JsonObject)[s]),
          ]).filter(([, value]) => value !== undefined && value !== null),
        ),
      } as unknown as FrigateConfig["cameras"][string])
    : (fullConfig.cameras?.[target] ??
      ({ enabled: true } as unknown as FrigateConfig["cameras"][string]));

  // Symmetric filter strip: same treatment as the per-section source
  // strip below, so default-only entries cancel out of the diff.
  for (const section of Object.keys(FILTER_SECTION_DEFS)) {
    const syntheticSection = (syntheticTargetCamera as unknown as JsonObject)[
      section
    ];
    if (syntheticSection && typeof syntheticSection === "object") {
      (syntheticTargetCamera as unknown as JsonObject)[section] =
        stripAutoDefaultFilters(
          section,
          syntheticSection as JsonObject,
          fullSchema,
          fullConfig,
          syntheticTargetCamera as CameraConfig,
        );
    }
  }

  // New-camera: synthetic's detect is from global (no per-camera derive),
  // so apply the formulas using source's fps to keep both sides aligned.
  // Existing-camera target already has the values from its own parse.
  if (targetIsNew && sourceCfg.detect) {
    const syntheticCameraObj = syntheticTargetCamera as unknown as JsonObject;
    const syntheticDetect = syntheticCameraObj.detect;
    if (syntheticDetect && typeof syntheticDetect === "object") {
      syntheticCameraObj.detect = applyDetectComputedDefaults(
        syntheticDetect as JsonObject,
        typeof sourceCfg.detect.fps === "number"
          ? sourceCfg.detect.fps
          : undefined,
      ) as JsonValue;
    }
  }

  const syntheticConfig: FrigateConfig = {
    ...fullConfig,
    cameras: {
      ...fullConfig.cameras,
      [target]: syntheticTargetCamera,
    },
  };

  for (const { key, section } of SECTION_KEYS) {
    if (!selectedKeys.has(key)) continue;
    const sourceSectionValue = (
      sourceCfg as unknown as Record<string, unknown>
    )[section];
    if (sourceSectionValue == null) continue;

    // Sanitize the source the same way BaseSection's form does
    // implicitly: strips runtime/derived fields and function-resolved
    // hidden paths (e.g. `hideAttributeFilters` removing untracked-
    // attribute entries based on source's track list).
    const sectionConfig = getSectionConfig(section, "camera");
    const resolvedHiddenFields = resolveHiddenFieldEntries(
      sectionConfig.hiddenFields,
      {
        fullConfig,
        fullCameraConfig: sourceCfg,
        level: "camera",
        formData: sourceSectionValue as ConfigSectionData,
      },
    );
    let pendingSectionValue: unknown = sanitizeSectionData(
      cloneDeep(sourceSectionValue) as ConfigSectionData,
      resolvedHiddenFields,
    );

    if (FILTER_SECTION_DEFS[section]) {
      pendingSectionValue = stripAutoDefaultFilters(
        section,
        pendingSectionValue as JsonObject,
        fullSchema,
        fullConfig,
        syntheticTargetCamera as CameraConfig,
      );
    }

    // Re-inject masks the parent section's hiddenFields just stripped,
    // when the mask category is also selected. `raw_mask` is never in
    // the API response; `enabled_in_config` is runtime-only.
    if (key === "motion" && selectedKeys.has("motion_mask")) {
      const srcMask = (sourceSectionValue as { mask?: unknown }).mask;
      if (srcMask !== undefined) {
        pendingSectionValue = {
          ...(pendingSectionValue as object),
          mask: stripDictEntryFields(srcMask, [
            "enabled_in_config",
            "raw_coordinates",
          ]),
        };
      }
    }
    if (key === "objects" && selectedKeys.has("object_masks")) {
      const srcMask = (sourceSectionValue as { mask?: unknown }).mask;
      if (srcMask !== undefined) {
        pendingSectionValue = {
          ...(pendingSectionValue as object),
          mask: stripDictEntryFields(srcMask, [
            "enabled_in_config",
            "raw_coordinates",
          ]),
        };
      }
    }

    // `color` is a Pydantic PrivateAttr (runtime-only).
    if (key === "zones") {
      pendingSectionValue = stripDictEntryFields(pendingSectionValue, [
        "color",
      ]);
    }

    const payload = prepareSectionSavePayload({
      pendingDataKey: `${target}::${section}`,
      pendingData: pendingSectionValue,
      config: syntheticConfig,
      fullSchema,
    });
    if (payload) {
      payloads.push(payload);
    }
  }

  // Standalone mask payloads — only when the parent section isn't also
  // selected (otherwise the masks were merged into its payload above).
  if (selectedKeys.has("motion_mask") && !selectedKeys.has("motion")) {
    const srcMask = (sourceCfg.motion as { mask?: unknown } | undefined)?.mask;
    if (srcMask !== undefined) {
      payloads.push({
        basePath: `cameras.${target}.motion`,
        sanitizedOverrides: {
          mask: stripDictEntryFields(srcMask, [
            "enabled_in_config",
            "raw_coordinates",
          ]) as JsonValue,
        },
        updateTopic: `config/cameras/${target}/${cameraUpdateTopicMap.motion}`,
        needsRestart: false,
        pendingDataKey: `${target}::motion.masks`,
      });
    }
  }
  if (selectedKeys.has("object_masks") && !selectedKeys.has("objects")) {
    const srcMask = (sourceCfg.objects as { mask?: unknown } | undefined)?.mask;
    if (srcMask !== undefined) {
      payloads.push({
        basePath: `cameras.${target}.objects`,
        sanitizedOverrides: {
          mask: stripDictEntryFields(srcMask, [
            "enabled_in_config",
            "raw_coordinates",
          ]) as JsonValue,
        },
        updateTopic: `config/cameras/${target}/${cameraUpdateTopicMap.objects}`,
        needsRestart: false,
        pendingDataKey: `${target}::objects.masks`,
      });
    }
  }

  // Profiles — wholesale dict replacement; no hot-reload topic.
  if (selectedKeys.has("profiles")) {
    const srcProfiles = (sourceCfg as { profiles?: unknown }).profiles;
    if (srcProfiles && typeof srcProfiles === "object") {
      payloads.push({
        basePath: `cameras.${target}.profiles`,
        sanitizedOverrides: cloneDeep(srcProfiles) as JsonObject,
        updateTopic: undefined,
        needsRestart: true,
        pendingDataKey: `${target}::profiles`,
      });
    }
  }

  // New camera: scrub Reset markers (see stripResetMarkers), then bundle
  // into one atomic `…/add` PUT so the backend validates the full camera
  // at once (avoids per-section ordering issues).
  if (targetIsNew) {
    const scrubbed = payloads
      .map((p) => {
        const cleaned = stripResetMarkers(p.sanitizedOverrides as JsonValue);
        return cleaned === undefined
          ? null
          : { ...p, sanitizedOverrides: cleaned as JsonObject };
      })
      .filter((p): p is SectionSavePayload => p !== null);
    return [bundleNewCameraPayload(scrubbed, target)];
  }

  return payloads;
}

/**
 * Flatten payloads to `SaveAllPreviewItem`s with camera-relative
 * `fieldPath`s (matches BaseSection's per-section preview).
 */
export function buildClonePreviewItems(
  payloads: SectionSavePayload[],
  targetCamera: string,
): SaveAllPreviewItem[] {
  const cameraBase = `cameras.${targetCamera}`;
  return payloads.flatMap((p) => {
    const flattened = flattenOverrides(p.sanitizedOverrides as JsonValue);
    const sectionRelativeBase =
      p.basePath === cameraBase
        ? ""
        : p.basePath.startsWith(`${cameraBase}.`)
          ? p.basePath.slice(cameraBase.length + 1)
          : p.basePath;
    return flattened.map(({ path, value }) => ({
      scope: "camera" as const,
      cameraName: targetCamera,
      fieldPath: path
        ? sectionRelativeBase
          ? `${sectionRelativeBase}.${path}`
          : path
        : sectionRelativeBase,
      value,
    }));
  });
}
