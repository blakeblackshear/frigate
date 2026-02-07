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

function schemaHasType(schema: Record<string, unknown>, type: string): boolean {
  const schemaType = schema.type;
  if (Array.isArray(schemaType)) {
    return schemaType.includes(type);
  }
  return schemaType === type;
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

  if (
    schemaObj.default === null &&
    schemaObj.type &&
    !Array.isArray(schemaObj.type) &&
    schemaObj.type !== "null"
  ) {
    schemaObj.type = [schemaObj.type, "null"];
  }

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
      const normalizedNonNull = normalizeNullableSchema(nonNull as RJSFSchema);
      const normalizedNonNullObj = normalizedNonNull as Record<string, unknown>;
      const nonNullType = normalizedNonNullObj.type;
      const mergedType = Array.isArray(nonNullType)
        ? Array.from(new Set([...nonNullType, "null"]))
        : nonNullType
          ? [nonNullType, "null"]
          : ["null"];
      const { anyOf: _anyOf, oneOf: _oneOf, ...rest } = schemaObj;
      const merged: Record<string, unknown> = {
        ...rest,
        ...normalizedNonNullObj,
        type: mergedType,
      };
      // When unwrapping a nullable enum, add null to the enum list so
      // JSON Schema validation accepts the null default value.
      if (Array.isArray(merged.enum)) {
        merged.enum = [...(merged.enum as unknown[]), null];
      }
      return merged as RJSFSchema;
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
      const normalizedNonNull = normalizeNullableSchema(nonNull as RJSFSchema);
      const normalizedNonNullObj = normalizedNonNull as Record<string, unknown>;
      const nonNullType = normalizedNonNullObj.type;
      const mergedType = Array.isArray(nonNullType)
        ? Array.from(new Set([...nonNullType, "null"]))
        : nonNullType
          ? [nonNullType, "null"]
          : ["null"];
      const { anyOf: _anyOf, oneOf: _oneOf, ...rest } = schemaObj;
      const merged: Record<string, unknown> = {
        ...rest,
        ...normalizedNonNullObj,
        type: mergedType,
      };
      // When unwrapping a nullable oneOf enum, add null to the enum list.
      if (Array.isArray(merged.enum)) {
        merged.enum = [...(merged.enum as unknown[]), null];
      }
      return merged as RJSFSchema;
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
    schemaHasType(schemaObj, "object")
  ) {
    return "color";
  }

  // Enum fields get select widget
  if (schemaObj.enum) {
    return "select";
  }

  // Boolean fields get switch widget
  if (schemaHasType(schemaObj, "boolean")) {
    return "switch";
  }

  // Number with range gets slider
  if (
    (schemaHasType(schemaObj, "number") ||
      schemaHasType(schemaObj, "integer")) &&
    schemaObj.minimum !== undefined &&
    schemaObj.maximum !== undefined
  ) {
    return "range";
  }

  // Array of strings gets tags widget
  if (
    schemaHasType(schemaObj, "array") &&
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
  currentPath: string[] = [],
): UiSchema {
  const uiSchema: UiSchema = {};
  const {
    fieldOrder,
    hiddenFields = [],
    advancedFields = [],
    widgetMappings = {},
    includeDescriptions = true,
  } = options;

  // Pre-split patterns for wildcard matching ("*") on nested paths
  const hiddenFieldPatterns = hiddenFields.map((field) => field.split("."));
  const advancedFieldPatterns = advancedFields.map((field) => field.split("."));

  // Match a concrete path to a wildcard pattern of equal length
  const matchesPathPattern = (path: string[], pattern: string[]) => {
    if (path.length !== pattern.length) {
      return false;
    }

    return pattern.every((segment, index) => {
      if (segment === "*") {
        return true;
      }
      return segment === path[index];
    });
  };

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

    // Track full path to support wildcard-based rules
    const fieldPath = [...currentPath, fieldName];

    // Hidden fields
    if (
      hiddenFieldPatterns.some((pattern) =>
        matchesPathPattern(fieldPath, pattern),
      )
    ) {
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
    if (
      advancedFieldPatterns.some((pattern) =>
        matchesPathPattern(fieldPath, pattern),
      )
    ) {
      fieldUiSchema["ui:options"] = {
        ...((fieldUiSchema["ui:options"] as object) || {}),
        advanced: true,
      };
    }

    // Handle nested objects recursively
    if (schemaHasType(fSchema, "object")) {
      if (isSchemaObject(fSchema.properties)) {
        Object.assign(
          fieldUiSchema,
          generateUiSchema(fieldSchema as RJSFSchema, options, fieldPath),
        );
      }

      if (isSchemaObject(fSchema.additionalProperties)) {
        // For dict-like schemas (additionalProperties), use "*" for path matching
        const additionalSchema = generateUiSchema(
          fSchema.additionalProperties as RJSFSchema,
          options,
          [...fieldPath, "*"],
        );
        if (Object.keys(additionalSchema).length > 0) {
          fieldUiSchema.additionalProperties = additionalSchema;
        }
      }
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
 * Merges default values from schema into form data.
 *
 * Handles anyOf/oneOf schemas (e.g., `anyOf: [MotionConfig, null]`) by
 * finding the non-null object branch and applying its property defaults.
 */
export function applySchemaDefaults(
  schema: RJSFSchema,
  formData: Record<string, unknown> = {},
): Record<string, unknown> {
  const result = { ...formData };
  const schemaObj = schema as Record<string, unknown>;

  // Resolve properties, falling back to the non-null object branch of
  // anyOf/oneOf schemas when top-level properties are not present.
  let properties = schemaObj.properties;
  if (!isSchemaObject(properties)) {
    const branches = (schemaObj.anyOf ?? schemaObj.oneOf) as
      | unknown[]
      | undefined;
    if (Array.isArray(branches)) {
      const objectBranch = branches.find(
        (s) =>
          isSchemaObject(s) &&
          (s as Record<string, unknown>).type !== "null" &&
          isSchemaObject((s as Record<string, unknown>).properties),
      ) as Record<string, unknown> | undefined;
      if (objectBranch) {
        properties = objectBranch.properties;
      }
    }
  }

  if (!isSchemaObject(properties)) {
    return result;
  }

  for (const [key, prop] of Object.entries(
    properties as Record<string, unknown>,
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
      schemaHasType(propSchema, "object") &&
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
