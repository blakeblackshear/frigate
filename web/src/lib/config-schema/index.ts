// Config Schema Utilities
// This module provides utilities for working with Frigate's JSON Schema

export {
  transformSchema,
  resolveSchemaRefs,
  resolveAndCleanSchema,
  extractSchemaSection,
  applySchemaDefaults,
} from "./transformer";
export type { TransformedSchema, UiSchemaOptions } from "./transformer";

export {
  createErrorTransformer,
  transformPydanticErrors,
  extractFieldPath,
} from "./errorMessages";
