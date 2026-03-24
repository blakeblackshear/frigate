// Custom error messages for RJSF validation
// Maps JSON Schema validation keywords to user-friendly messages

import type { ErrorTransformer } from "@rjsf/utils";
import type { i18n as I18n } from "i18next";

/**
 * Creates an error transformer function for RJSF
 * Transforms technical JSON Schema errors into user-friendly messages
 */
export function createErrorTransformer(i18n: I18n): ErrorTransformer {
  const t = i18n.t.bind(i18n);

  const normalizeParams = (
    params: Record<string, unknown> | undefined,
  ): Record<string, unknown> => {
    if (!params) {
      return {};
    }

    const allowedValues = params.allowedValues as unknown;

    return {
      ...params,
      allowedValues: Array.isArray(allowedValues)
        ? allowedValues.join(", ")
        : allowedValues,
    };
  };

  const getFieldPathFromProperty = (
    property: string | undefined,
    params: Record<string, unknown>,
    errorType: string,
  ): string => {
    const basePath = (property || "").replace(/^\./, "").trim();
    const missingProperty = params.missingProperty as string | undefined;

    if (errorType === "required" && missingProperty) {
      return basePath ? `${basePath}.${missingProperty}` : missingProperty;
    }

    return basePath;
  };

  return (errors) =>
    errors.map((error) => {
      const errorType = error.name || "";
      if (!errorType) {
        return error;
      }

      const normalizedParams = normalizeParams(error.params);
      const fieldPath = getFieldPathFromProperty(
        error.property,
        normalizedParams,
        errorType,
      );

      let message: string | undefined;

      // Try field-specific validation message first
      if (fieldPath) {
        const fieldKey = `${fieldPath}.validation.${errorType}`;
        if (i18n.exists(fieldKey)) {
          message = t(fieldKey, normalizedParams);
        }
      }

      // Fall back to generic validation message
      if (!message) {
        const genericKey = errorType;
        if (i18n.exists(genericKey, { ns: "config/validation" })) {
          message = t(genericKey, {
            ...normalizedParams,
            ns: ["config/validation"],
          });
        }
      }

      if (!message) {
        return error;
      }

      return {
        ...error,
        message,
      };
    });
}

/**
 * Extracts field path from a Pydantic validation error location
 */
export function extractFieldPath(loc: (string | number)[]): string {
  // Skip the first element if it's 'body' (FastAPI adds this)
  const startIndex = loc[0] === "body" ? 1 : 0;
  return loc.slice(startIndex).join(".");
}

/**
 * Transforms Pydantic validation errors into RJSF-compatible errors
 */
export function transformPydanticErrors(
  pydanticErrors: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>,
): Array<{ property: string; message: string }> {
  return pydanticErrors.map((error) => ({
    property: extractFieldPath(error.loc),
    message: error.msg,
  }));
}
