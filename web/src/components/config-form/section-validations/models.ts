import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import { DEFAULT_SCENE, getSceneLabel } from "@/utils/modelUtil";

/**
 * A camera that names no scene runs the model whose scene is `default`.
 * Without one the backend rejects the config outright once a second model
 * exists, and with a single model it silently runs every camera on whatever
 * that model is. Both are surprising, so require the default to be present.
 * Scenes are free-form names, so also check that no two models share one, and
 * that one model isn't split across scenes. The backend combines models that
 * load the same file on the same detector, so running one model per scene only
 * splits the detection work across separate detectors.
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

  // detector and path -> the scene of the first model using them
  const seen = new Map<string, string>();

  formData.forEach((model, index) => {
    if (!isJsonObject(model) || typeof model.path !== "string" || !model.path) {
      return;
    }

    const devices = Array.isArray(model.devices) ? model.devices : [];
    const detector =
      typeof devices[0] === "string" ? devices[0].split(":")[0] : "";
    const key = `${detector}|${model.path}`;
    const other = seen.get(key);

    if (other === undefined) {
      seen.set(key, scenes[index]);
      return;
    }

    errors.addError?.(
      t("models.sameModel", {
        ns: "config/validation",
        scene: getSceneLabel(t, other),
        other: getSceneLabel(t, scenes[index]),
      }),
    );
  });

  return errors;
}
