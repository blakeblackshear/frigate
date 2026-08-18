import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";

const DEFAULT_SCENE = "all";

/**
 * A camera that names no scene runs the model whose scene is `all`. Without one
 * the backend rejects the config outright once a second model exists, and with
 * a single model it silently runs every camera on whatever that model is. Both
 * are surprising, so require the default to be present.
 */
export function validateDefaultModelExists(
  formData: unknown,
  errors: FormValidation,
  t: TFunction,
): FormValidation {
  if (!Array.isArray(formData) || formData.length === 0) {
    return errors;
  }

  const hasDefault = formData.some(
    (model) => isJsonObject(model) && model.scene === DEFAULT_SCENE,
  );

  if (!hasDefault) {
    errors.addError?.(t("models.defaultRequired", { ns: "config/validation" }));
  }

  return errors;
}
