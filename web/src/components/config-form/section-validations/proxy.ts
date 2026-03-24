import type { FormValidation } from "@rjsf/utils";
import type { TFunction } from "i18next";
import { isJsonObject } from "@/lib/utils";
import type { JsonObject } from "@/types/configForm";

export function validateProxyRoleHeader(
  formData: unknown,
  errors: FormValidation,
  t: TFunction,
): FormValidation {
  if (!isJsonObject(formData as JsonObject)) {
    return errors;
  }

  const headerMap = (formData as JsonObject).header_map;
  if (!isJsonObject(headerMap)) {
    return errors;
  }

  const roleHeader = headerMap.role;
  const roleHeaderDefined =
    typeof roleHeader === "string" && roleHeader.trim().length > 0;
  const roleMap = headerMap.role_map;
  const roleMapHasEntries =
    isJsonObject(roleMap) && Object.keys(roleMap).length > 0;

  if (roleMapHasEntries && !roleHeaderDefined) {
    const headerMapErrors = errors.header_map as {
      role?: { addError?: (message: string) => void };
    };
    headerMapErrors?.role?.addError?.(
      t("proxy.header_map.roleHeaderRequired", { ns: "config/validation" }),
    );
  }

  return errors;
}
