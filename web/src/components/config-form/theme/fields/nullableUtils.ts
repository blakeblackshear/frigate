// Utilities for handling anyOf with null patterns
import type { StrictRJSFSchema } from "@rjsf/utils";

/**
 * Checks if a schema is anyOf/oneOf with exactly [Type, null].
 * This indicates a nullable field in Pydantic schemas.
 */
export function isNullableUnionSchema(schema: StrictRJSFSchema): boolean {
  const union = schema.anyOf ?? schema.oneOf;
  if (!union || !Array.isArray(union) || union.length !== 2) {
    return false;
  }

  let hasNull = false;
  let nonNullCount = 0;

  for (const item of union) {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const itemSchema = item as StrictRJSFSchema;

    if (itemSchema.type === "null") {
      hasNull = true;
    } else {
      nonNullCount += 1;
    }
  }

  return hasNull && nonNullCount === 1;
}

/**
 * Backwards-compatible alias for nullable fields
 */
export function isSimpleNullableField(schema: StrictRJSFSchema): boolean {
  return isNullableUnionSchema(schema);
}

/**
 * Get the non-null schema from an anyOf containing [Type, null]
 */
export function getNonNullSchema(
  schema: StrictRJSFSchema,
): StrictRJSFSchema | null {
  const union = schema.anyOf ?? schema.oneOf;
  if (!union || !Array.isArray(union)) {
    return null;
  }

  return (
    (union.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as StrictRJSFSchema).type !== "null",
    ) as StrictRJSFSchema) || null
  );
}
