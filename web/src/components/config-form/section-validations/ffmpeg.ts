import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import type { JsonObject } from "@/types/configForm";

export function validateFfmpegInputRoles(
  formData: unknown,
  errors: FormValidation,
  t: TFunction,
): FormValidation {
  if (!isJsonObject(formData as JsonObject)) {
    return errors;
  }

  const inputs = (formData as JsonObject).inputs;
  if (!Array.isArray(inputs)) {
    return errors;
  }

  const roleCounts = new Map<string, number>();
  let hasDetect = false;
  inputs.forEach((input) => {
    if (!isJsonObject(input) || !Array.isArray(input.roles)) {
      return;
    }
    input.roles.forEach((role) => {
      if (typeof role !== "string") {
        return;
      }
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    if (input.roles.includes("detect")) {
      hasDetect = true;
    }
  });

  const hasDuplicates = Array.from(roleCounts.values()).some(
    (count) => count > 1,
  );

  if (hasDuplicates) {
    const inputsErrors = errors.inputs as {
      addError?: (message: string) => void;
    };
    inputsErrors?.addError?.(
      t("ffmpeg.inputs.rolesUnique", { ns: "config/validation" }),
    );
  }

  if (!hasDetect) {
    const inputsErrors = errors.inputs as {
      addError?: (message: string) => void;
    };
    inputsErrors?.addError?.(
      t("ffmpeg.inputs.detectRequired", { ns: "config/validation" }),
    );
  }

  return errors;
}
