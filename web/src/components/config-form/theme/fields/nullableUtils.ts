// Utilities for handling anyOf with null patterns
import type { StrictRJSFSchema } from "@rjsf/utils";

/**
 * Checks if a schema is anyOf with exactly [PrimitiveType, null]
 * where the primitive has no additional constraints
 */
export function isSimpleNullableField(schema: StrictRJSFSchema): boolean {
  if (
    !schema.anyOf ||
    !Array.isArray(schema.anyOf) ||
    schema.anyOf.length !== 2
  ) {
    return false;
  }

  const items = schema.anyOf;
  let hasNull = false;
  let simpleType: StrictRJSFSchema | null = null;

  // eslint-disable-next-line no-restricted-syntax
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const itemSchema = item as StrictRJSFSchema;

    if (itemSchema.type === "null") {
      hasNull = true;
    } else if (
      itemSchema.type &&
      !("$ref" in itemSchema) &&
      !("additionalProperties" in itemSchema) &&
      !("items" in itemSchema) &&
      !("pattern" in itemSchema) &&
      !("minimum" in itemSchema) &&
      !("maximum" in itemSchema) &&
      !("exclusiveMinimum" in itemSchema) &&
      !("exclusiveMaximum" in itemSchema)
    ) {
      simpleType = itemSchema;
    }
  }

  return hasNull && simpleType !== null;
}

/**
 * Get the non-null schema from an anyOf containing [Type, null]
 */
export function getNonNullSchema(
  schema: StrictRJSFSchema,
): StrictRJSFSchema | null {
  if (!schema.anyOf || !Array.isArray(schema.anyOf)) {
    return null;
  }

  return (
    (schema.anyOf.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as StrictRJSFSchema).type !== "null",
    ) as StrictRJSFSchema) || null
  );
}
