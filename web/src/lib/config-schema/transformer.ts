// Schema Transformer
// Converts Pydantic-generated JSON Schema to RJSF-compatible format with uiSchema

import type { RJSFSchema, UiSchema } from "@rjsf/utils";

export interface TransformedSchema {
  schema: RJSFSchema;
  uiSchema: UiSchema;
}

export interface UiSchemaOptions {
  /** Field ordering for the schema */
  fieldOrder?: string[];
  /** Fields to hide from the form */
  hiddenFields?: string[];
  /** Fields to mark as advanced (collapsed by default) */
  advancedFields?: string[];
  /** Custom widget mappings */
  widgetMappings?: Record<string, string>;
  /** Whether to include descriptions */
  includeDescriptions?: boolean;
  /** i18n namespace for field labels (e.g., "config/detect") */
  i18nNamespace?: string;
}

// Type guard for schema objects
function isSchemaObject(
  schema: unknown,
): schema is RJSFSchema & Record<string, unknown> {
  return typeof schema === "object" && schema !== null;
}

/**
 * Normalizes nullable schemas by unwrapping anyOf/oneOf [Type, null] patterns.
 *
 * When Pydantic generates JSON Schema for optional fields (e.g., Optional[int]),
 * it creates anyOf/oneOf unions like: [{ type: "integer", ... }, { type: "null" }]
 *
 * This causes RJSF to treat the field as a multi-schema field with a dropdown selector,
 * which leads to the field disappearing when the value is cleared (becomes undefined/null).
 *
 * This function unwraps these simple nullable patterns to a single non-null schema,
 * allowing fields to remain visible and functional even when empty.
 *
 * @example
 * // Input: { anyOf: [{ type: "integer" }, { type: "null" }] }
 * // Output: { type: "integer" }
 *
 * @example
 * // Input: { oneOf: [{ type: "string" }, { type: "null" }] }
 * // Output: { type: "string" }
 */
function normalizeNullableSchema(schema: RJSFSchema): RJSFSchema {
  if (!isSchemaObject(schema)) {
    return schema;
  }

  const schemaObj = schema as Record<string, unknown>;

  const anyOf = schemaObj.anyOf;
  if (Array.isArray(anyOf)) {
    const hasNull = anyOf.some(
      (item) =>
        isSchemaObject(item) &&
        (item as Record<string, unknown>).type === "null",
    );
    const nonNull = anyOf.find(
      (item) =>
        isSchemaObject(item) &&
        (item as Record<string, unknown>).type !== "null",
    ) as RJSFSchema | undefined;

    if (hasNull && nonNull && anyOf.length === 2) {
      const { anyOf: _anyOf, oneOf: _oneOf, ...rest } = schemaObj;
      return normalizeNullableSchema({ ...nonNull, ...rest } as RJSFSchema);
    }

    return {
      ...schemaObj,
      anyOf: anyOf
        .filter(isSchemaObject)
        .map((item) => normalizeNullableSchema(item as RJSFSchema)),
    } as RJSFSchema;
  }

  const oneOf = schemaObj.oneOf;
  if (Array.isArray(oneOf)) {
    const hasNull = oneOf.some(
      (item) =>
        isSchemaObject(item) &&
        (item as Record<string, unknown>).type === "null",
    );
    const nonNull = oneOf.find(
      (item) =>
        isSchemaObject(item) &&
        (item as Record<string, unknown>).type !== "null",
    ) as RJSFSchema | undefined;

    if (hasNull && nonNull && oneOf.length === 2) {
      const { anyOf: _anyOf, oneOf: _oneOf, ...rest } = schemaObj;
      return normalizeNullableSchema({ ...nonNull, ...rest } as RJSFSchema);
    }

    return {
      ...schemaObj,
      oneOf: oneOf
        .filter(isSchemaObject)
        .map((item) => normalizeNullableSchema(item as RJSFSchema)),
    } as RJSFSchema;
  }

  if (isSchemaObject(schemaObj.properties)) {
    const normalizedProps: Record<string, RJSFSchema> = {};
    for (const [key, prop] of Object.entries(
      schemaObj.properties as Record<string, unknown>,
    )) {
      if (isSchemaObject(prop)) {
        normalizedProps[key] = normalizeNullableSchema(prop as RJSFSchema);
      }
    }
    return { ...schemaObj, properties: normalizedProps } as RJSFSchema;
  }

  if (schemaObj.items) {
    if (Array.isArray(schemaObj.items)) {
      return {
        ...schemaObj,
        items: schemaObj.items
          .filter(isSchemaObject)
          .map((item) => normalizeNullableSchema(item as RJSFSchema)),
      } as RJSFSchema;
    } else if (isSchemaObject(schemaObj.items)) {
      return {
        ...schemaObj,
        items: normalizeNullableSchema(schemaObj.items as RJSFSchema),
      } as RJSFSchema;
    }
  }

  if (
    schemaObj.additionalProperties &&
    isSchemaObject(schemaObj.additionalProperties)
  ) {
    return {
      ...schemaObj,
      additionalProperties: normalizeNullableSchema(
        schemaObj.additionalProperties as RJSFSchema,
      ),
    } as RJSFSchema;
  }

  return schema;
}

/**
 * Resolves $ref references in a JSON Schema
 * This converts Pydantic's $defs-based schema to inline schemas
 */
export function resolveSchemaRefs(
  schema: RJSFSchema,
  rootSchema?: RJSFSchema,
): RJSFSchema {
  const root = rootSchema || schema;
  const defs =
    (root as Record<string, unknown>).$defs ||
    (root as Record<string, unknown>).definitions ||
    {};

  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const schemaObj = schema as Record<string, unknown>;

  // Handle $ref
  if (schemaObj.$ref && typeof schemaObj.$ref === "string") {
    const refPath = schemaObj.$ref
      .replace(/^#\/\$defs\//, "")
      .replace(/^#\/definitions\//, "");
    const resolved = (defs as Record<string, unknown>)[refPath];
    if (isSchemaObject(resolved)) {
      // Merge any additional properties from the original schema
      const { $ref: _ref, ...rest } = schemaObj;
      return resolveSchemaRefs({ ...resolved, ...rest } as RJSFSchema, root);
    }
    return schema;
  }

  // Handle allOf (Pydantic uses this for inheritance)
  if (Array.isArray(schemaObj.allOf)) {
    const merged: Record<string, unknown> = {};
    for (const subSchema of schemaObj.allOf) {
      if (isSchemaObject(subSchema)) {
        const resolved = resolveSchemaRefs(subSchema as RJSFSchema, root);
        Object.assign(merged, resolved);
        if (
          isSchemaObject(resolved) &&
          (resolved as Record<string, unknown>).properties
        ) {
          merged.properties = {
            ...(merged.properties as object),
            ...((resolved as Record<string, unknown>).properties as object),
          };
        }
        if (
          isSchemaObject(resolved) &&
          Array.isArray((resolved as Record<string, unknown>).required)
        ) {
          merged.required = [
            ...((merged.required as string[]) || []),
            ...((resolved as Record<string, unknown>).required as string[]),
          ];
        }
      }
    }
    // Include any extra properties from the parent schema
    const { allOf: _allOf, ...rest } = schemaObj;
    return { ...merged, ...rest } as RJSFSchema;
  }

  // Handle anyOf/oneOf
  if (Array.isArray(schemaObj.anyOf)) {
    return {
      ...schemaObj,
      anyOf: schemaObj.anyOf
        .filter(isSchemaObject)
        .map((s) => resolveSchemaRefs(s as RJSFSchema, root)),
    } as RJSFSchema;
  }
  if (Array.isArray(schemaObj.oneOf)) {
    return {
      ...schemaObj,
      oneOf: schemaObj.oneOf
        .filter(isSchemaObject)
        .map((s) => resolveSchemaRefs(s as RJSFSchema, root)),
    } as RJSFSchema;
  }

  // Handle properties
  if (isSchemaObject(schemaObj.properties)) {
    const resolvedProps: Record<string, RJSFSchema> = {};
    for (const [key, prop] of Object.entries(
      schemaObj.properties as Record<string, unknown>,
    )) {
      if (isSchemaObject(prop)) {
        resolvedProps[key] = resolveSchemaRefs(prop as RJSFSchema, root);
      }
    }
    return { ...schemaObj, properties: resolvedProps } as RJSFSchema;
  }

  // Handle items (for arrays)
  if (schemaObj.items) {
    if (Array.isArray(schemaObj.items)) {
      return {
        ...schemaObj,
        items: schemaObj.items
          .filter(isSchemaObject)
          .map((item) => resolveSchemaRefs(item as RJSFSchema, root)),
      } as RJSFSchema;
    } else if (isSchemaObject(schemaObj.items)) {
      return {
        ...schemaObj,
        items: resolveSchemaRefs(schemaObj.items as RJSFSchema, root),
      } as RJSFSchema;
    }
  }

  // Handle additionalProperties (for dicts)
  if (
    schemaObj.additionalProperties &&
    isSchemaObject(schemaObj.additionalProperties)
  ) {
    return {
      ...schemaObj,
      additionalProperties: resolveSchemaRefs(
        schemaObj.additionalProperties as RJSFSchema,
        root,
      ),
    } as RJSFSchema;
  }

  return schema;
}

/**
 * Wrapper that resolves refs and strips $defs from result
 * Use this as the main entry point for resolving schemas
 */
export function resolveAndCleanSchema(schema: RJSFSchema): RJSFSchema {
  const resolved = resolveSchemaRefs(schema);
  // Remove $defs from result - they're no longer needed after resolution
  const {
    $defs: _defs,
    definitions: _definitions,
    ...cleanSchema
  } = resolved as Record<string, unknown>;
  return cleanSchema as RJSFSchema;
}

/**
 * Determines the appropriate widget for a schema field
 */
function getWidgetForField(
  fieldName: string,
  fieldSchema: RJSFSchema,
  customMappings?: Record<string, string>,
): string | undefined {
  // Check custom mappings first
  if (customMappings?.[fieldName]) {
    return customMappings[fieldName];
  }

  const schemaObj = fieldSchema as Record<string, unknown>;

  // Password fields
  if (
    fieldName.toLowerCase().includes("password") ||
    fieldName.toLowerCase().includes("secret")
  ) {
    return "password";
  }

  // Color fields
  if (
    fieldName.toLowerCase().includes("color") &&
    schemaObj.type === "object"
  ) {
    return "color";
  }

  // Enum fields get select widget
  if (schemaObj.enum) {
    return "select";
  }

  // Boolean fields get switch widget
  if (schemaObj.type === "boolean") {
    return "switch";
  }

  // Number with range gets slider
  if (
    (schemaObj.type === "number" || schemaObj.type === "integer") &&
    schemaObj.minimum !== undefined &&
    schemaObj.maximum !== undefined
  ) {
    return "range";
  }

  // Array of strings gets tags widget
  if (
    schemaObj.type === "array" &&
    isSchemaObject(schemaObj.items) &&
    (schemaObj.items as Record<string, unknown>).type === "string"
  ) {
    return "tags";
  }

  return undefined;
}

/**
 * Generates a uiSchema for a given JSON Schema
 */
function generateUiSchema(
  schema: RJSFSchema,
  options: UiSchemaOptions = {},
): UiSchema {
  const uiSchema: UiSchema = {};
  const {
    fieldOrder,
    hiddenFields = [],
    advancedFields = [],
    widgetMappings = {},
    includeDescriptions = true,
  } = options;

  const schemaObj = schema as Record<string, unknown>;

  // Set field ordering
  if (fieldOrder && fieldOrder.length > 0) {
    uiSchema["ui:order"] = [...fieldOrder, "*"];
  }

  if (!isSchemaObject(schemaObj.properties)) {
    return uiSchema;
  }

  for (const [fieldName, fieldSchema] of Object.entries(
    schemaObj.properties as Record<string, unknown>,
  )) {
    if (!isSchemaObject(fieldSchema)) continue;

    const fSchema = fieldSchema as Record<string, unknown>;
    const fieldUiSchema: UiSchema = {};

    // Hidden fields
    if (hiddenFields.includes(fieldName)) {
      fieldUiSchema["ui:widget"] = "hidden";
      uiSchema[fieldName] = fieldUiSchema;
      continue;
    }

    // Widget selection
    const widget = getWidgetForField(
      fieldName,
      fieldSchema as RJSFSchema,
      widgetMappings,
    );
    if (widget) {
      fieldUiSchema["ui:widget"] = widget;
    }

    // Description
    if (!includeDescriptions && fSchema.description) {
      fieldUiSchema["ui:description"] = "";
    }

    // Advanced fields - mark for collapsible
    if (advancedFields.includes(fieldName)) {
      fieldUiSchema["ui:options"] = {
        ...((fieldUiSchema["ui:options"] as object) || {}),
        advanced: true,
      };
    }

    // Handle nested objects recursively
    if (fSchema.type === "object" && isSchemaObject(fSchema.properties)) {
      const nestedOptions: UiSchemaOptions = {
        hiddenFields: hiddenFields
          .filter((f) => f.startsWith(`${fieldName}.`))
          .map((f) => f.replace(`${fieldName}.`, "")),
        advancedFields: advancedFields
          .filter((f) => f.startsWith(`${fieldName}.`))
          .map((f) => f.replace(`${fieldName}.`, "")),
        widgetMappings: Object.fromEntries(
          Object.entries(widgetMappings)
            .filter(([k]) => k.startsWith(`${fieldName}.`))
            .map(([k, v]) => [k.replace(`${fieldName}.`, ""), v]),
        ),
        includeDescriptions,
      };
      Object.assign(
        fieldUiSchema,
        generateUiSchema(fieldSchema as RJSFSchema, nestedOptions),
      );
    }

    if (Object.keys(fieldUiSchema).length > 0) {
      uiSchema[fieldName] = fieldUiSchema;
    }
  }

  return uiSchema;
}

/**
 * Transforms a Pydantic JSON Schema to RJSF format
 * Resolves references and generates appropriate uiSchema
 */
export function transformSchema(
  rawSchema: RJSFSchema,
  options: UiSchemaOptions = {},
): TransformedSchema {
  // Resolve all $ref references and clean the result
  const cleanSchema = resolveAndCleanSchema(rawSchema);
  const normalizedSchema = normalizeNullableSchema(cleanSchema);

  // Generate uiSchema
  const uiSchema = generateUiSchema(normalizedSchema, options);

  return {
    schema: normalizedSchema,
    uiSchema,
  };
}

/**
 * Extracts a subsection of the schema by path
 * Useful for rendering individual config sections
 */
export function extractSchemaSection(
  schema: RJSFSchema,
  path: string,
): RJSFSchema | null {
  const schemaObj = schema as Record<string, unknown>;
  const defs = (schemaObj.$defs || schemaObj.definitions || {}) as Record<
    string,
    unknown
  >;
  const parts = path.split(".");
  let current = schema as Record<string, unknown>;

  for (const part of parts) {
    if (!isSchemaObject(current.properties)) {
      return null;
    }

    let propSchema = (current.properties as Record<string, unknown>)[
      part
    ] as Record<string, unknown>;

    if (!propSchema) {
      return null;
    }

    // Resolve $ref if present
    if (propSchema.$ref && typeof propSchema.$ref === "string") {
      const refPath = (propSchema.$ref as string)
        .replace(/^#\/\$defs\//, "")
        .replace(/^#\/definitions\//, "");
      const resolved = defs[refPath] as Record<string, unknown>;
      if (resolved) {
        // Merge any additional properties from original
        const { $ref: _ref, ...rest } = propSchema;
        propSchema = { ...resolved, ...rest };
      } else {
        return null;
      }
    }

    current = propSchema;
  }

  // Return section schema with $defs included for nested ref resolution
  const sectionWithDefs = {
    ...current,
    $defs: defs,
  } as RJSFSchema;

  // Resolve all nested refs and clean the result
  return resolveAndCleanSchema(sectionWithDefs);
}

/**
 * Merges default values from schema into form data
 */
export function applySchemaDefaults(
  schema: RJSFSchema,
  formData: Record<string, unknown> = {},
): Record<string, unknown> {
  const result = { ...formData };
  const schemaObj = schema as Record<string, unknown>;

  if (!isSchemaObject(schemaObj.properties)) {
    return result;
  }

  for (const [key, prop] of Object.entries(
    schemaObj.properties as Record<string, unknown>,
  )) {
    if (!isSchemaObject(prop)) continue;

    const propSchema = prop as Record<string, unknown>;

    if (
      result[key] === undefined &&
      propSchema.default !== undefined &&
      propSchema.default !== null
    ) {
      result[key] = propSchema.default;
    } else if (
      propSchema.type === "object" &&
      isSchemaObject(propSchema.properties) &&
      result[key] !== undefined
    ) {
      result[key] = applySchemaDefaults(
        prop as RJSFSchema,
        result[key] as Record<string, unknown>,
      );
    }
  }

  return result;
}
