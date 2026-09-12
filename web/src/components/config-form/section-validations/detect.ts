import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import type { JsonObject } from "@/types/configForm";

export function validateDetectDimensions(
  formData: unknown,
  errors: FormValidation,
  t: TFunction,
): FormValidation {
  if (!isJsonObject(formData as JsonObject)) {
    return errors;
  }

  const data = formData as JsonObject;
  const width = data.width;
  const height = data.height;

  const widthErrors = errors.width as
    | { addError?: (message: string) => void }
    | undefined;
  const heightErrors = errors.height as
    | { addError?: (message: string) => void }
    | undefined;

  const message = t("detect.dimensionMustBeEven", { ns: "config/validation" });

  if (typeof width === "number" && width % 2 !== 0) {
    widthErrors?.addError?.(message);
  }
  if (typeof height === "number" && height % 2 !== 0) {
    heightErrors?.addError?.(message);
  }

  return errors;
}
