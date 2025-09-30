/**
 * Utility functions for handling Frigate configuration
 * Includes YAML conversion, validation, and schema helpers
 */

import {
  ConfigSchema,
  SchemaField,
  ValidationResult,
  ValidationError,
  FormFieldMeta,
  ObjectSchema,
  ArraySchema,
  DictSchema,
  RefSchema,
} from "@/types/configSchema";

/**
 * Convert a configuration object to YAML string
 * Uses browser-compatible YAML serialization
 * @param config - Configuration object to convert
 * @returns YAML string representation
 */
export function configToYaml(config: unknown): string {
  // Simple YAML conversion - handles basic types
  // For production, consider using js-yaml library
  return jsonToYaml(config);
}

/**
 * Parse YAML string to configuration object
 * @param yaml - YAML string to parse
 * @returns Parsed configuration object
 */
export function yamlToConfig(yaml: string): unknown {
  // For now, assume the backend handles YAML parsing
  // In a full implementation, use js-yaml library
  try {
    // This is a simple fallback - in production use js-yaml
    return JSON.parse(yaml);
  } catch {
    throw new Error("Failed to parse YAML. Invalid format.");
  }
}

/**
 * Convert JSON object to YAML string (simplified)
 * @param obj - Object to convert
 * @param indent - Current indentation level
 * @returns YAML string
 */
function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    // Check if string needs quoting
    if (
      obj.includes(":") ||
      obj.includes("#") ||
      obj.includes("\n") ||
      obj.trim() !== obj
    ) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return (
      "\n" +
      obj
        .map((item) => `${spaces}- ${jsonToYaml(item, indent + 1)}`)
        .join("\n")
    );
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}";

    return (
      "\n" +
      entries
        .map(([key, value]) => {
          const yamlValue = jsonToYaml(value, indent + 1);
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return `${spaces}${key}:${yamlValue}`;
          }
          if (Array.isArray(value)) {
            return `${spaces}${key}:${yamlValue}`;
          }
          return `${spaces}${key}: ${yamlValue}`;
        })
        .join("\n")
    );
  }

  return String(obj);
}

/**
 * Validate configuration against schema
 * @param config - Configuration object to validate
 * @param schema - JSON schema to validate against
 * @returns Validation result with any errors
 */
export function validateConfig(
  config: unknown,
  schema: ConfigSchema,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Basic validation - for production, use a proper JSON schema validator
  // like ajv or zod
  validateValue(config, schema, [], errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Recursively validate a value against a schema
 * @param value - Value to validate
 * @param schema - Schema to validate against
 * @param path - Current path in the object
 * @param errors - Array to collect errors
 */
function validateValue(
  value: unknown,
  schema: SchemaField,
  path: string[],
  errors: ValidationError[],
): void {
  // Handle $ref
  if ("$ref" in schema) {
    // In production, resolve the reference
    return;
  }

  // Handle anyOf, oneOf, allOf
  if ("anyOf" in schema || "oneOf" in schema || "allOf" in schema) {
    // In production, validate against the union types
    return;
  }

  // Type checking
  if ("type" in schema) {
    const { type } = schema;

    if (type === "string") {
      if (typeof value !== "string") {
        errors.push({
          path,
          message: `Expected string, got ${typeof value}`,
          value,
        });
        return;
      }
      // Validate string constraints
      if ("minLength" in schema && value.length < schema.minLength!) {
        errors.push({
          path,
          message: `String must be at least ${schema.minLength} characters`,
          value,
        });
      }
      if ("maxLength" in schema && value.length > schema.maxLength!) {
        errors.push({
          path,
          message: `String must be at most ${schema.maxLength} characters`,
          value,
        });
      }
      if ("pattern" in schema && schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `String must match pattern ${schema.pattern}`,
            value,
          });
        }
      }
      if ("enum" in schema && !schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(", ")}`,
          value,
        });
      }
    } else if (type === "number" || type === "integer") {
      if (typeof value !== "number") {
        errors.push({
          path,
          message: `Expected ${type}, got ${typeof value}`,
          value,
        });
        return;
      }
      if (type === "integer" && !Number.isInteger(value)) {
        errors.push({
          path,
          message: "Expected integer value",
          value,
        });
      }
      if ("minimum" in schema && value < schema.minimum!) {
        errors.push({
          path,
          message: `Value must be at least ${schema.minimum}`,
          value,
        });
      }
      if ("maximum" in schema && value > schema.maximum!) {
        errors.push({
          path,
          message: `Value must be at most ${schema.maximum}`,
          value,
        });
      }
    } else if (type === "boolean") {
      if (typeof value !== "boolean") {
        errors.push({
          path,
          message: `Expected boolean, got ${typeof value}`,
          value,
        });
      }
    } else if (type === "array") {
      if (!Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected array, got ${typeof value}`,
          value,
        });
        return;
      }
      const arraySchema = schema as ArraySchema;
      if (
        "minItems" in arraySchema &&
        value.length < arraySchema.minItems!
      ) {
        errors.push({
          path,
          message: `Array must have at least ${arraySchema.minItems} items`,
          value,
        });
      }
      if (
        "maxItems" in arraySchema &&
        value.length > arraySchema.maxItems!
      ) {
        errors.push({
          path,
          message: `Array must have at most ${arraySchema.maxItems} items`,
          value,
        });
      }
      // Validate each item
      value.forEach((item, index) => {
        validateValue(item, arraySchema.items, [...path, String(index)], errors);
      });
    } else if (type === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected object, got ${typeof value}`,
          value,
        });
        return;
      }
      const objectSchema = schema as ObjectSchema | DictSchema;
      const objValue = value as Record<string, unknown>;

      if ("properties" in objectSchema) {
        // Object with defined properties
        const objSchema = objectSchema as ObjectSchema;

        // Check required fields
        if (objSchema.required) {
          objSchema.required.forEach((field) => {
            if (!(field in objValue)) {
              errors.push({
                path: [...path, field],
                message: `Required field '${field}' is missing`,
              });
            }
          });
        }

        // Validate each property
        Object.entries(objValue).forEach(([key, val]) => {
          if (objSchema.properties[key]) {
            validateValue(
              val,
              objSchema.properties[key],
              [...path, key],
              errors,
            );
          } else if (
            objSchema.additionalProperties === false
          ) {
            errors.push({
              path: [...path, key],
              message: `Unexpected property '${key}'`,
              value: val,
            });
          } else if (
            typeof objSchema.additionalProperties === "object"
          ) {
            validateValue(
              val,
              objSchema.additionalProperties as SchemaField,
              [...path, key],
              errors,
            );
          }
        });
      } else if ("additionalProperties" in objectSchema) {
        // Dictionary/map with dynamic keys
        const dictSchema = objectSchema as DictSchema;
        Object.entries(objValue).forEach(([key, val]) => {
          validateValue(
            val,
            dictSchema.additionalProperties,
            [...path, key],
            errors,
          );
        });
      }
    }
  }
}

/**
 * Get default value from schema
 * @param schema - Schema field to extract default from
 * @returns Default value or undefined
 */
export function getDefaultValue(schema: SchemaField): unknown {
  if ("default" in schema) {
    return schema.default;
  }

  if ("type" in schema) {
    const { type } = schema;
    if (type === "string") return "";
    if (type === "number" || type === "integer") return 0;
    if (type === "boolean") return false;
    if (type === "array") return [];
    if (type === "object") {
      if ("properties" in schema) {
        const obj: Record<string, unknown> = {};
        const objSchema = schema as ObjectSchema;
        Object.entries(objSchema.properties).forEach(([key, fieldSchema]) => {
          const defaultVal = getDefaultValue(fieldSchema);
          if (defaultVal !== undefined) {
            obj[key] = defaultVal;
          }
        });
        return obj;
      }
      return {};
    }
  }

  if ("anyOf" in schema && schema.anyOf.length > 0) {
    return getDefaultValue(schema.anyOf[0]);
  }

  if ("oneOf" in schema && schema.oneOf.length > 0) {
    return getDefaultValue(schema.oneOf[0]);
  }

  return undefined;
}

/**
 * Extract form field metadata from schema
 * @param name - Field name
 * @param schema - Schema field
 * @param required - Whether field is required
 * @returns Form field metadata
 */
export function getFormFieldMeta(
  name: string,
  schema: SchemaField,
  required = false,
): FormFieldMeta {
  const meta: FormFieldMeta = {
    name,
    label: "title" in schema && schema.title ? schema.title : formatFieldName(name),
    description: "description" in schema ? schema.description : undefined,
    type: "type" in schema ? schema.type : "unknown",
    required,
    defaultValue: getDefaultValue(schema),
  };

  // Extract validation rules
  const validation: Record<string, unknown> = {};

  if ("type" in schema) {
    const { type } = schema;

    if (type === "string") {
      if ("minLength" in schema) validation.minLength = schema.minLength;
      if ("maxLength" in schema) validation.maxLength = schema.maxLength;
      if ("pattern" in schema) validation.pattern = schema.pattern;
    }

    if (type === "number" || type === "integer") {
      if ("minimum" in schema) {
        validation.min = schema.minimum;
        meta.min = schema.minimum;
      }
      if ("maximum" in schema) {
        validation.max = schema.maximum;
        meta.max = schema.maximum;
      }
      if ("multipleOf" in schema) {
        validation.step = schema.multipleOf;
        meta.step = schema.multipleOf;
      }
    }

    if (type === "array") {
      if ("minItems" in schema) validation.minItems = (schema as ArraySchema).minItems;
      if ("maxItems" in schema) validation.maxItems = (schema as ArraySchema).maxItems;
    }
  }

  if ("enum" in schema) {
    meta.options = schema.enum.map((val) => ({
      label: String(val),
      value: val as string | number,
    }));
  }

  if ("examples" in schema && schema.examples && schema.examples.length > 0) {
    meta.examples = schema.examples;
    meta.placeholder = `e.g., ${schema.examples[0]}`;
  }

  if (Object.keys(validation).length > 0) {
    meta.validation = validation;
  }

  return meta;
}

/**
 * Format a field name for display
 * @param name - Field name to format
 * @returns Formatted label
 */
function formatFieldName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Resolve a $ref in the schema
 * @param ref - Reference string (e.g., "#/definitions/CameraConfig")
 * @param schema - Root schema containing definitions
 * @returns Resolved schema or undefined
 */
export function resolveRef(
  ref: string,
  schema: ConfigSchema,
): SchemaField | undefined {
  // Parse the reference path
  const parts = ref.replace(/^#\//, "").split("/");

  let current: unknown = schema;
  for (const part of parts) {
    if (typeof current === "object" && current !== null && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current as SchemaField;
}

/**
 * Deep merge two objects
 * @param target - Target object
 * @param source - Source object to merge
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  });

  return result;
}

/**
 * Check if a value is empty (for form validation)
 * @param value - Value to check
 * @returns True if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Get nested value from object using path
 * @param obj - Object to get value from
 * @param path - Path array (e.g., ["cameras", "front_door", "detect"])
 * @returns Value at path or undefined
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (typeof current === "object" && current !== null && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Set nested value in object using path
 * @param obj - Object to set value in
 * @param path - Path array
 * @param value - Value to set
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  if (path.length === 0) return;

  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[path[path.length - 1]] = value;
}