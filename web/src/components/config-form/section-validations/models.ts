import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import { DEFAULT_SCENE } from "@/utils/modelUtil";

/**
 * A camera that names no scene runs the model whose scene is `default`.
 * Without one the backend rejects the config outright once a second model
 * exists, and with a single model it silently runs every camera on whatever
 * that model is. Both are surprising, so require the default to be present.
 * Scenes are free-form names, so also check that no two models share one.
 */
export function validateModelScenes(
  formData: unknown,
  errors: FormValidation,
  t: TFunction,
): FormValidation {
  if (!Array.isArray(formData) || formData.length === 0) {
    return errors;
  }

  const scenes = formData.map((model) =>
    isJsonObject(model) && typeof model.scene === "string" ? model.scene : "",
  );

  if (!scenes.includes(DEFAULT_SCENE)) {
    errors.addError?.(t("models.defaultRequired", { ns: "config/validation" }));
  }

  if (new Set(scenes).size !== scenes.length) {
    errors.addError?.(t("models.sceneDuplicate", { ns: "config/validation" }));
  }

  return errors;
}
