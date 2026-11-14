import get from "lodash/get";
import isEqual from "lodash/isEqual";
import set from "lodash/set";
import cloneDeep from "lodash/cloneDeep";
import type { CameraConfig } from "@/types/frigateConfig";
import type {
  ConditionalMessage,
  MessageConditionContext,
} from "@/components/config-form/section-configs/types";

/**
 * Camera fields the dispatcher can change at runtime from the live view, MQTT,
 * or Home Assistant. Mirrors the camera command handlers in
 * frigate/comms/dispatcher.py. Runtime changes persist across restarts and win
 * over yaml until the field is saved again, so the settings form (which edits
 * yaml) has to show the config value and flag the divergence.
 *
 * Paths are relative to the section.
 */
export const RUNTIME_TOGGLEABLE_FIELDS: Record<string, string[]> = {
  audio: ["enabled"],
  birdseye: ["enabled", "modes"],
  detect: ["enabled"],
  motion: ["enabled", "improve_contrast", "threshold", "contour_area"],
  notifications: ["enabled"],
  objects: ["genai.enabled"],
  onvif: ["autotracking.enabled"],
  record: ["enabled"],
  review: ["alerts.enabled", "detections.enabled", "genai.enabled"],
  snapshots: ["enabled"],
};

/**
 * The value a field holds in yaml, or undefined when the backend exposes no
 * config-side copy of it.
 *
 * Two sources carry it. `base_config` is the pre-profile snapshot, sent only
 * while a profile is active. The `<field>_in_config` siblings are always sent,
 * but only exist for the toggles the backend tracks that way (`detect`,
 * `snapshots`, and `birdseye` have none).
 */
export function getConfiguredFieldValue(
  cameraConfig: CameraConfig | undefined,
  sectionPath: string,
  fieldPath: string,
): unknown {
  if (!cameraConfig) return undefined;

  const inConfig = get(cameraConfig, `${sectionPath}.${fieldPath}_in_config`);
  if (inConfig !== undefined && inConfig !== null) {
    return inConfig;
  }

  const base = cameraConfig.base_config?.[sectionPath];
  return base !== undefined ? get(base, fieldPath) : undefined;
}

export type RuntimeOverride = {
  /** The value saved in yaml. */
  configured: unknown;
  /** The value the camera is running with right now. */
  runtime: unknown;
};

/**
 * Describes a field whose live value has drifted from the saved config, or
 * undefined when the two agree or the config value can't be read.
 */
export function getRuntimeOverride(
  cameraConfig: CameraConfig | undefined,
  sectionPath: string | undefined,
  fieldPath: string,
): RuntimeOverride | undefined {
  if (!cameraConfig || !sectionPath) return undefined;
  if (!RUNTIME_TOGGLEABLE_FIELDS[sectionPath]?.includes(fieldPath)) {
    return undefined;
  }

  const configured = getConfiguredFieldValue(
    cameraConfig,
    sectionPath,
    fieldPath,
  );
  if (configured === undefined) return undefined;

  const runtime = get(cameraConfig, `${sectionPath}.${fieldPath}`);
  if (runtime === undefined || isEqual(configured, runtime)) return undefined;

  return { configured, runtime };
}

/**
 * Whether a section is enabled in yaml but turned off on the running camera.
 * This is the state that makes a dependent warning read as a contradiction,
 * since the form shows the section switch on.
 */
export function isSectionRuntimeDisabled(
  cameraConfig: CameraConfig | undefined,
  sectionPath: string,
): boolean {
  const override = getRuntimeOverride(cameraConfig, sectionPath, "enabled");
  return override?.configured === true && override.runtime === false;
}

/**
 * Overlays the saved config values onto a section so the form edits yaml
 * rather than live state. Returns the section unchanged when nothing drifted.
 */
export function applyConfiguredToggles(
  cameraConfig: CameraConfig | undefined,
  sectionPath: string,
  sectionValue: unknown,
): unknown {
  const fields = RUNTIME_TOGGLEABLE_FIELDS[sectionPath];
  if (!fields || !sectionValue || typeof sectionValue !== "object") {
    return sectionValue;
  }

  let result = sectionValue;
  for (const field of fields) {
    const override = getRuntimeOverride(cameraConfig, sectionPath, field);
    if (!override) continue;

    if (result === sectionValue) {
      result = cloneDeep(sectionValue);
    }
    set(result as object, field, override.configured);
  }

  return result;
}

/**
 * Picks the wording for a message. A message that depends on another section
 * being on switches to its runtime wording when the config has that section
 * enabled but the running camera has it off.
 */
export function resolveMessageKey(
  message: Pick<ConditionalMessage, "messageKey" | "runtimeOverride">,
  ctx: MessageConditionContext | undefined,
): string {
  const runtime = message.runtimeOverride;
  if (!runtime || !ctx || ctx.level !== "camera") return message.messageKey;

  return isSectionRuntimeDisabled(ctx.fullCameraConfig, runtime.section)
    ? runtime.messageKey
    : message.messageKey;
}
