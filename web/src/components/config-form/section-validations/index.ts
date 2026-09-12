import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { validateDetectDimensions } from "./detect";
import { validateFfmpegInputRoles } from "./ffmpeg";
import { validateProxyRoleHeader } from "./proxy";

export type SectionValidation = (
  formData: unknown,
  errors: FormValidation,
) => FormValidation;

type SectionValidationOptions = {
  sectionPath: string;
  level: "global" | "camera";
  t: TFunction;
};

export function getSectionValidation({
  sectionPath,
  level,
  t,
}: SectionValidationOptions): SectionValidation | undefined {
  if (sectionPath === "detect") {
    return (formData, errors) => validateDetectDimensions(formData, errors, t);
  }

  if (sectionPath === "ffmpeg" && level === "camera") {
    return (formData, errors) => validateFfmpegInputRoles(formData, errors, t);
  }

  if (sectionPath === "proxy" && level === "global") {
    return (formData, errors) => validateProxyRoleHeader(formData, errors, t);
  }

  return undefined;
}
