import cloneDeep from "lodash/cloneDeep";
import type { RJSFSchema } from "@rjsf/utils";

import {
  cameraUpdateTopicMap,
  flattenOverrides,
  prepareSectionSavePayload,
  type SectionSavePayload,
} from "@/utils/configUtil";
import type { SaveAllPreviewItem } from "@/components/overlay/detail/SaveAllPreviewPopover";
import type { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import type { JsonObject, JsonValue } from "@/types/configForm";
import { processCameraName } from "@/utils/cameraUtil";

/**
 * Static catalog of categories the clone dialog exposes. Each entry maps to
 * one or more keys under `cameras.<name>` and tells the dialog (and
 * `buildClonedCameraPayloads`) how to render and treat the category.
 *
 * Most categories pair 1:1 with an existing section config (`record`,
 * `motion`, `objects`, etc.) and flow through `prepareSectionSavePayload`.
 * A handful are special cases handled directly in `cameraClone.ts`:
 *
 *   - `motion_mask` / `object_masks`: carve-outs that merge into their parent
 *     section's payload when also selected, or emit a standalone mask-only
 *     payload otherwise.
 *   - `ffmpeg_live`: bundles `ffmpeg` + `live` for new-camera targets only.
 *   - `type` / `profiles`: bypass `prepareSectionSavePayload` because they
 *     are not edited through schema-driven form sections.
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
 * Compare detect dimensions exactly. Used to decide whether spatial-category
 * defaults start on or off when targeting an existing camera. Exact match is
 * the only always-safe default — zone/mask coordinates can be stored as
 * relative (0-1) OR explicit pixels, and aspect-ratio-only tolerance still
 * distorts explicit polygons.
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
 * Compute the initial selection set for the dialog based on target type and
 * resolution match. Pure function — the dialog re-runs this whenever the
 * target or source changes to reset defaults sanely.
 *
 *   - new-camera target: every non-`newCameraOnly` category that has
 *     `defaultOnExisting: true` is on, plus every `forcedForNewCamera`.
 *     Spatial categories are all on (the cloned detect dims become the new
 *     camera's, so the source's polygons are internally consistent).
 *
 *   - existing-camera target with matching resolution: each category uses
 *     its `defaultOnExisting`.
 *
 *   - existing-camera target with mismatched resolution: every spatial
 *     category defaults off; non-spatial uses `defaultOnExisting`.
 */
export function getCategoryDefaults(
  targetIsNew: boolean,
  resolutionMatches: boolean,
): Set<CloneCategoryKey> {
  const selected = new Set<CloneCategoryKey>();
  for (const cat of CLONE_CATEGORIES) {
    if (cat.newCameraOnly && !targetIsNew) continue;
    if (targetIsNew && cat.forcedForNewCamera) {
      selected.add(cat.key);
      continue;
    }
    if (cat.group === "spatial") {
      if (targetIsNew || resolutionMatches) {
        if (cat.defaultOnExisting) selected.add(cat.key);
      }
      continue;
    }
    if (cat.defaultOnExisting) selected.add(cat.key);
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
};

/**
 * Produce the ordered list of section-save payloads needed to clone the
 * selected categories from `sourceCfg` to the target camera. The dialog
 * iterates the returned array and issues one `PUT /api/config/set` per
 * payload, in array order.
 *
 * Order rules:
 *   1. For new-camera targets, the first payload establishes the camera
 *      (enabled + friendly_name + ffmpeg + live) and uses
 *      `update_topic: config/cameras/<target>/add`.
 *   2. The `type` payload (camera type lpr/normal) goes before all other
 *      per-section updates because it influences how the backend resolves
 *      camera-level overrides.
 *   3. All `prepareSectionSavePayload`-derived sections come next.
 *   4. The `profiles` payload (wholesale dict replacement) comes last —
 *      it doesn't dispatch a hot-reload topic, so ordering relative to
 *      other sections doesn't matter, but keeping it last keeps the
 *      restart-prompt logic readable.
 */
export function buildClonedCameraPayloads({
  sourceCfg,
  sourceName,
  targetInput,
  targetIsNew,
  selectedKeys,
  fullConfig,
  fullSchema,
}: BuildClonedPayloadsArgs): SectionSavePayload[] {
  const payloads: SectionSavePayload[] = [];

  const { finalCameraName: target, friendlyName } = targetIsNew
    ? processCameraName(targetInput)
    : { finalCameraName: targetInput, friendlyName: undefined };

  // 1. New-camera establishing payload
  if (targetIsNew) {
    const addOverrides: Record<string, unknown> = {
      enabled: true,
    };
    if (friendlyName) {
      addOverrides.friendly_name = friendlyName;
    }
    if (selectedKeys.has("ffmpeg_live") && sourceCfg.ffmpeg) {
      addOverrides.ffmpeg = cloneDeep(sourceCfg.ffmpeg);
    }
    if (selectedKeys.has("ffmpeg_live") && sourceCfg.live) {
      addOverrides.live = cloneDeep(sourceCfg.live);
    }
    payloads.push({
      basePath: `cameras.${target}`,
      sanitizedOverrides: addOverrides as JsonObject,
      updateTopic: `config/cameras/${target}/add`,
      needsRestart: true,
      pendingDataKey: `${target}::__add__`,
    });
  }

  // 2. Camera type (top-level scalar — bypasses prepareSectionSavePayload)
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

  // 3. Section-backed categories — flow through the existing per-section
  //    save infrastructure so restart and update-topic behavior matches the
  //    rest of the settings UI exactly.
  const SECTION_KEYS: Array<{ key: CloneCategoryKey; section: string }> = [
    { key: "record", section: "record" },
    { key: "snapshots", section: "snapshots" },
    { key: "review", section: "review" },
    { key: "motion", section: "motion" },
    { key: "objects", section: "objects" },
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
    { key: "detect", section: "detect" },
    { key: "zones", section: "zones" },
  ];

  // Build a synthetic config that pretends the target camera exists with
  // the source's section value as its current pending data. This lets us
  // reuse prepareSectionSavePayload unchanged.
  const syntheticConfig: FrigateConfig = {
    ...fullConfig,
    cameras: {
      ...fullConfig.cameras,
      // If target is new, seed an empty camera entry so the helper can
      // compute a diff against defaults instead of crashing.
      [target]:
        fullConfig.cameras?.[target] ??
        ({ enabled: true } as unknown as FrigateConfig["cameras"][string]),
    },
  };

  for (const { key, section } of SECTION_KEYS) {
    if (!selectedKeys.has(key)) continue;
    const sourceSectionValue = (
      sourceCfg as unknown as Record<string, unknown>
    )[section];
    if (sourceSectionValue == null) continue;

    let pendingSectionValue = cloneDeep(sourceSectionValue);

    // Carve-out: when both Motion sensitivity and Motion mask are selected,
    // merge the mask fields into the motion payload (the motion section's
    // hiddenFields would otherwise strip them before write).
    if (key === "motion" && selectedKeys.has("motion_mask")) {
      const srcMotion = sourceSectionValue as {
        mask?: unknown;
        raw_mask?: unknown;
      };
      pendingSectionValue = {
        ...(pendingSectionValue as object),
        ...(srcMotion.mask !== undefined ? { mask: srcMotion.mask } : {}),
        ...(srcMotion.raw_mask !== undefined
          ? { raw_mask: srcMotion.raw_mask }
          : {}),
      };
    }
    if (key === "objects" && selectedKeys.has("object_masks")) {
      const srcObjects = sourceSectionValue as { mask?: unknown };
      pendingSectionValue = {
        ...(pendingSectionValue as object),
        ...(srcObjects.mask !== undefined ? { mask: srcObjects.mask } : {}),
      };
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

  // 3a. Standalone mask payloads — emitted ONLY when the parent section's
  //     category is unselected. (When both are selected the masks were
  //     merged into the parent payload above.)
  if (selectedKeys.has("motion_mask") && !selectedKeys.has("motion")) {
    const srcMotion = sourceCfg.motion as
      | { mask?: unknown; raw_mask?: unknown }
      | undefined;
    if (
      srcMotion &&
      (srcMotion.mask !== undefined || srcMotion.raw_mask !== undefined)
    ) {
      payloads.push({
        basePath: `cameras.${target}.motion`,
        sanitizedOverrides: {
          ...(srcMotion.mask !== undefined
            ? { mask: srcMotion.mask as JsonValue }
            : {}),
          ...(srcMotion.raw_mask !== undefined
            ? { raw_mask: srcMotion.raw_mask as JsonValue }
            : {}),
        } as JsonObject,
        updateTopic: `config/cameras/${target}/${cameraUpdateTopicMap.motion}`,
        needsRestart: false,
        pendingDataKey: `${target}::motion.masks`,
      });
    }
  }
  if (selectedKeys.has("object_masks") && !selectedKeys.has("objects")) {
    const srcObjects = sourceCfg.objects as { mask?: unknown } | undefined;
    if (srcObjects && srcObjects.mask !== undefined) {
      payloads.push({
        basePath: `cameras.${target}.objects`,
        sanitizedOverrides: { mask: srcObjects.mask as JsonValue },
        updateTopic: `config/cameras/${target}/${cameraUpdateTopicMap.objects}`,
        needsRestart: false,
        pendingDataKey: `${target}::objects.masks`,
      });
    }
  }

  // 4. Profiles — wholesale replacement of cameras.<target>.profiles.
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

  // sourceName is currently unused but kept in the signature so the dialog
  // can pass it explicitly (matches the helper's logical boundary — "clone
  // FROM x TO y" — and lets future logging hook in without a signature change).
  void sourceName;

  return payloads;
}

/**
 * Flatten clone payloads into the preview-popover item shape. Each item's
 * `fieldPath` is rendered camera-relative (e.g., `record.retain.days`)
 * rather than absolute (`cameras.front_door.record.retain.days`), matching
 * the section-level Save All preview pattern in BaseSection.
 */
export function buildClonePreviewItems(
  payloads: SectionSavePayload[],
  targetCamera: string,
): SaveAllPreviewItem[] {
  const cameraPrefix = `cameras.${targetCamera}.`;
  return payloads.flatMap((p) => {
    const flattened = flattenOverrides(p.sanitizedOverrides as JsonValue);
    const sectionRelativeBase = p.basePath.startsWith(cameraPrefix)
      ? p.basePath.slice(cameraPrefix.length)
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
