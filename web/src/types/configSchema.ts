/**
 * Type definitions for Frigate configuration schema
 * These types describe the JSON schema structure used to dynamically generate forms
 */

/**
 * Base schema type that can be any of the specific field types
 */
export type SchemaField =
  | StringSchema
  | NumberSchema
  | IntegerSchema
  | BooleanSchema
  | EnumSchema
  | ArraySchema
  | ObjectSchema
  | DictSchema
  | AnyOfSchema
  | OneOfSchema
  | AllOfSchema
  | RefSchema;

/**
 * String field schema
 */
export interface StringSchema {
  type: "string";
  title?: string;
  description?: string;
  default?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  examples?: string[];
  enum?: string[];
}

/**
 * Number field schema (float)
 */
export interface NumberSchema {
  type: "number";
  title?: string;
  description?: string;
  default?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  examples?: number[];
}

/**
 * Integer field schema
 */
export interface IntegerSchema {
  type: "integer";
  title?: string;
  description?: string;
  default?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  examples?: number[];
}

/**
 * Boolean field schema
 */
export interface BooleanSchema {
  type: "boolean";
  title?: string;
  description?: string;
  default?: boolean;
}

/**
 * Enum field schema (select from predefined values)
 */
export interface EnumSchema {
  type: "string" | "number" | "integer";
  title?: string;
  description?: string;
  enum: (string | number)[];
  default?: string | number;
  examples?: (string | number)[];
}

/**
 * Array field schema
 */
export interface ArraySchema {
  type: "array";
  title?: string;
  description?: string;
  items: SchemaField;
  default?: unknown[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

/**
 * Object field schema (structured nested object)
 */
export interface ObjectSchema {
  type: "object";
  title?: string;
  description?: string;
  properties: Record<string, SchemaField>;
  required?: string[];
  additionalProperties?: boolean | SchemaField;
  default?: Record<string, unknown>;
}

/**
 * Dictionary/Map field schema (dynamic keys)
 */
export interface DictSchema {
  type: "object";
  title?: string;
  description?: string;
  additionalProperties: SchemaField;
  default?: Record<string, unknown>;
}

/**
 * AnyOf schema (union of multiple types)
 */
export interface AnyOfSchema {
  anyOf: SchemaField[];
  title?: string;
  description?: string;
  default?: unknown;
}

/**
 * OneOf schema (exactly one of multiple types)
 */
export interface OneOfSchema {
  oneOf: SchemaField[];
  title?: string;
  description?: string;
  default?: unknown;
}

/**
 * AllOf schema (combination of multiple schemas)
 */
export interface AllOfSchema {
  allOf: SchemaField[];
  title?: string;
  description?: string;
  default?: unknown;
}

/**
 * Reference schema (refers to another schema definition)
 */
export interface RefSchema {
  $ref: string;
  title?: string;
  description?: string;
}

/**
 * Root configuration schema structure
 */
export interface ConfigSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type: "object";
  properties: Record<string, SchemaField>;
  required?: string[];
  definitions?: Record<string, SchemaField>;
  $defs?: Record<string, SchemaField>;
}

/**
 * Validation result for configuration
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  path: string[];
  message: string;
  field?: string;
  value?: unknown;
}

/**
 * Form field metadata extracted from schema
 */
export interface FormFieldMeta {
  name: string;
  label: string;
  description?: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: Record<string, unknown>;
  options?: Array<{ label: string; value: string | number }>;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  examples?: unknown[];
}

/**
 * Configuration section metadata
 */
export interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: string[];
  subsections?: ConfigSection[];
}

/**
 * Configuration tab metadata
 */
export interface ConfigTab {
  id: string;
  title: string;
  icon?: string;
  sections: ConfigSection[];
}

/**
 * Form state for configuration editor
 */
export interface ConfigFormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
}

/**
 * Helper type to extract schema type
 */
export type SchemaType<T extends SchemaField> = T extends { type: infer U }
  ? U
  : never;

/**
 * Helper type to check if schema is an object
 */
export type IsObjectSchema<T extends SchemaField> = T extends ObjectSchema
  ? true
  : T extends DictSchema
    ? true
    : false;

/**
 * Helper type to check if schema is an array
 */
export type IsArraySchema<T extends SchemaField> = T extends ArraySchema
  ? true
  : false;