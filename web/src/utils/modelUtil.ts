import type { TFunction } from "i18next";
import type { HiddenFieldContext } from "@/types/configForm";
import { DetectionModelConfig, FrigateConfig } from "@/types/frigateConfig";

/** The scene of the model used by cameras that don't name one. */
export const DEFAULT_SCENE = "default";

/** Display name for a scene; custom scenes are shown as the user named them. */
export function getSceneLabel(t: TFunction, scene: string | undefined): string {
  if (!scene || scene === DEFAULT_SCENE) {
    return t("detectionModels.scenes.default", { ns: "views/settings" });
  }

  return scene;
}

/**
 * The scenes a detect section can choose from: those of the configured models,
 * default first when a default model exists, plus the saved scene when no model
 * uses it, so it can still be seen and changed.
 */
export function getSceneChoices(
  ctx: Pick<HiddenFieldContext, "fullConfig" | "fullCameraConfig" | "level">,
): string[] {
  const scenes = [
    ...new Set(
      ctx.fullConfig.models?.map((model) => model.scene || DEFAULT_SCENE),
    ),
  ].sort((a, b) => Number(b === DEFAULT_SCENE) - Number(a === DEFAULT_SCENE));
  const saved =
    (ctx.level !== "global"
      ? ctx.fullCameraConfig?.detect?.scene
      : undefined) ?? ctx.fullConfig.detect?.scene;

  if (saved && !scenes.includes(saved)) {
    scenes.push(saved);
  }

  return scenes;
}

/**
 * The model a camera runs on, matched by the camera's detect scene.
 *
 * Falls back to the default model, then to the only configured model, which
 * is what the backend does when a camera does not name a scene.
 */
export function getModelForCamera(
  config?: FrigateConfig,
  camera?: string,
): DetectionModelConfig | undefined {
  const models = config?.models;

  if (!models?.length) {
    return undefined;
  }

  const scene = camera ? config?.cameras?.[camera]?.detect?.scene : undefined;

  if (scene) {
    const match = models.find((model) => model.scene == scene);

    if (match) {
      return match;
    }
  }

  return models.find((model) => model.scene == DEFAULT_SCENE) ?? models[0];
}

/** The model used when the question is not about a specific camera. */
export function getPrimaryModel(
  config?: FrigateConfig,
): DetectionModelConfig | undefined {
  return getModelForCamera(config);
}

/** Every object attribute across all configured models. */
export function getAllAttributes(config?: FrigateConfig): string[] {
  const attributes = new Set<string>();

  config?.models?.forEach((model) =>
    model.all_attributes?.forEach((attribute) => attributes.add(attribute)),
  );

  return [...attributes];
}

/** Whether a label is an attribute of any configured model. */
export function isAttributeLabel(
  config: FrigateConfig | undefined,
  label: string,
): boolean {
  return !!config?.models?.some((model) =>
    model.all_attributes?.includes(label),
  );
}

/** Whether an attribute belongs to a parent label in any configured model. */
export function isAttributeOfLabel(
  config: FrigateConfig | undefined,
  label: string,
  attribute: string,
): boolean {
  return !!config?.models?.some((model) =>
    model.attributes_map?.[label]?.includes(attribute),
  );
}
