// Custom error messages for RJSF validation
// Maps JSON Schema validation keywords to user-friendly messages

import type { ErrorTransformer } from "@rjsf/utils";
import type { TFunction } from "i18next";

export interface ErrorMessageMap {
  [keyword: string]: string | ((params: Record<string, unknown>) => string);
}

// Default error messages for common validation keywords
export const defaultErrorMessages: ErrorMessageMap = {
  required: "This field is required",
  type: (params) => {
    const expectedType = params.type as string;
    return `Expected ${expectedType} value`;
  },
  minimum: (params) => `Must be at least ${params.limit}`,
  maximum: (params) => `Must be at most ${params.limit}`,
  minLength: (params) => `Must be at least ${params.limit} characters`,
  maxLength: (params) => `Must be at most ${params.limit} characters`,
  pattern: "Invalid format",
  format: (params) => {
    const format = params.format as string;
    const formatLabels: Record<string, string> = {
      email: "Invalid email address",
      uri: "Invalid URL",
      "date-time": "Invalid date/time format",
      ipv4: "Invalid IP address",
      ipv6: "Invalid IPv6 address",
    };
    return formatLabels[format] || `Invalid ${format} format`;
  },
  enum: (params) => {
    const allowedValues = params.allowedValues as unknown;
    if (Array.isArray(allowedValues)) {
      return `Must be one of: ${allowedValues.join(", ")}`;
    }
    return "Must be one of the allowed values";
  },
  const: "Value does not match expected constant",
  uniqueItems: "All items must be unique",
  minItems: (params) => `Must have at least ${params.limit} items`,
  maxItems: (params) => `Must have at most ${params.limit} items`,
  additionalProperties: "Unknown property is not allowed",
  oneOf: "Must match exactly one of the allowed schemas",
  anyOf: "Must match at least one of the allowed schemas",
};

/**
 * Creates an error transformer function for RJSF
 * Transforms technical JSON Schema errors into user-friendly messages
 */
export function createErrorTransformer(t: TFunction): ErrorTransformer {
  const getDefaultMessage = (
    errorType: string,
    params: Record<string, unknown>,
  ): string | undefined => {
    const template = defaultErrorMessages[errorType];

    if (!template) {
      return undefined;
    }

    if (typeof template === "function") {
      return template(params);
    }

    return template;
  };

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

      const missingTranslation = "__missing_translation__";

      // Try field-specific validation message first
      if (fieldPath) {
        const fieldKey = `${fieldPath}.validation.${errorType}`;
        const translated = t(fieldKey, {
          ...normalizedParams,
          ns: ["config"],
          defaultValue: missingTranslation,
        });
        if (translated !== fieldKey && translated !== missingTranslation) {
          message = translated;
        }
      }

      // Fall back to generic validation message
      if (!message) {
        const genericKey = errorType;
        const translated = t(genericKey, {
          ...normalizedParams,
          ns: ["validation"],
          defaultValue: missingTranslation,
        });
        if (translated !== genericKey && translated !== missingTranslation) {
          message = translated;
        }
      }

      // Fall back to English defaults
      if (!message) {
        message = getDefaultMessage(errorType, normalizedParams);
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
