// Custom error messages for RJSF validation
// Maps JSON Schema validation keywords to user-friendly messages

import type { ErrorTransformer } from "@rjsf/utils";

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
  enum: "Must be one of the allowed values",
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
export function createErrorTransformer(
  customMessages: ErrorMessageMap = {},
): ErrorTransformer {
  const messages = { ...defaultErrorMessages, ...customMessages };

  return (errors) => {
    return errors.map((error) => {
      const keyword = error.name || "";
      const messageTemplate = messages[keyword];

      if (!messageTemplate) {
        return error;
      }

      let message: string;
      if (typeof messageTemplate === "function") {
        message = messageTemplate(error.params || {});
      } else {
        message = messageTemplate;
      }

      return {
        ...error,
        message,
      };
    });
  };
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
