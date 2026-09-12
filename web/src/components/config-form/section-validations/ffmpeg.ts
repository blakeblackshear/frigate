import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import type { JsonObject } from "@/types/configForm";

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

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
  let hasInvalidHwaccel = false;
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
    } else if (hasValue(input.hwaccel_args)) {
      hasInvalidHwaccel = true;
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

  if (hasInvalidHwaccel) {
    const inputsErrors = errors.inputs as {
      addError?: (message: string) => void;
    };
    inputsErrors?.addError?.(
      t("ffmpeg.inputs.hwaccelDetectOnly", { ns: "config/validation" }),
    );
  }

  return errors;
}
