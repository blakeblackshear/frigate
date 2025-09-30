/**
 * Schema-driven form renderer component
 * Dynamically generates form fields based on JSON schema
 */

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  SchemaField,
  ObjectSchema,
  ArraySchema,
  ConfigSchema,
} from "@/types/configSchema";
import { getFormFieldMeta, resolveRef } from "@/lib/configUtils";
import { StringField } from "./fields/StringField";
import { NumberField } from "./fields/NumberField";
import { BooleanField } from "./fields/BooleanField";
import { EnumField } from "./fields/EnumField";
import { ArrayField } from "./fields/ArrayField";
import { DictField } from "./fields/DictField";
import { NestedObjectField } from "./fields/NestedObjectField";

export interface SchemaFormRendererProps {
  schema: SchemaField;
  path: string;
  rootSchema?: ConfigSchema;
  required?: boolean;
}

/**
 * SchemaFormRenderer component recursively renders form fields based on schema
 */
export function SchemaFormRenderer({
  schema,
  path,
  rootSchema,
  required = false,
}: SchemaFormRendererProps) {
  const { setValue } = useFormContext();

  // Handle $ref
  if ("$ref" in schema && rootSchema) {
    const resolvedSchema = resolveRef(schema.$ref, rootSchema);
    if (resolvedSchema) {
      return (
        <SchemaFormRenderer
          schema={resolvedSchema}
          path={path}
          rootSchema={rootSchema}
          required={required}
        />
      );
    }
    return null;
  }

  // Handle anyOf, oneOf, allOf - use the first option
  if ("anyOf" in schema && schema.anyOf.length > 0) {
    return (
      <SchemaFormRenderer
        schema={schema.anyOf[0]}
        path={path}
        rootSchema={rootSchema}
        required={required}
      />
    );
  }

  if ("oneOf" in schema && schema.oneOf.length > 0) {
    return (
      <SchemaFormRenderer
        schema={schema.oneOf[0]}
        path={path}
        rootSchema={rootSchema}
        required={required}
      />
    );
  }

  if ("allOf" in schema && schema.allOf.length > 0) {
    // Merge all schemas - simplified version
    return (
      <SchemaFormRenderer
        schema={schema.allOf[0]}
        path={path}
        rootSchema={rootSchema}
        required={required}
      />
    );
  }

  // Must have a type
  if (!("type" in schema)) {
    return null;
  }

  const { type } = schema;
  const fieldMeta = getFormFieldMeta(
    path.split(".").pop() || path,
    schema,
    required,
  );

  // Boolean field
  if (type === "boolean") {
    return <BooleanField field={fieldMeta} path={path} />;
  }

  // Enum field (string/number with enum constraint)
  if ("enum" in schema && schema.enum) {
    return <EnumField field={fieldMeta} path={path} />;
  }

  // String field
  if (type === "string") {
    return <StringField field={fieldMeta} path={path} />;
  }

  // Number/Integer field
  if (type === "number" || type === "integer") {
    return <NumberField field={fieldMeta} path={path} />;
  }

  // Array field
  if (type === "array") {
    const arraySchema = schema as ArraySchema;
    const itemType =
      "type" in arraySchema.items ? arraySchema.items.type : "string";

    // For simple arrays (strings, numbers)
    if (
      itemType === "string" ||
      itemType === "number" ||
      itemType === "integer"
    ) {
      return (
        <ArrayField field={fieldMeta} path={path} itemType={itemType} />
      );
    }

    // For complex arrays (objects), would need more sophisticated handling
    // This is a simplified version
    return (
      <NestedObjectField field={fieldMeta} path={path} defaultOpen={false}>
        <div className="text-sm text-muted-foreground">
          Complex array type - edit in YAML mode for full control
        </div>
      </NestedObjectField>
    );
  }

  // Object field
  if (type === "object") {
    const objectSchema = schema as ObjectSchema;

    // Dictionary/Map (additionalProperties with no defined properties)
    if (
      objectSchema.additionalProperties &&
      (!objectSchema.properties || Object.keys(objectSchema.properties).length === 0)
    ) {
      const valueType =
        typeof objectSchema.additionalProperties === "object" &&
        "type" in objectSchema.additionalProperties
          ? objectSchema.additionalProperties.type
          : "string";
      return (
        <DictField field={fieldMeta} path={path} valueType={valueType} />
      );
    }

    // Structured object with defined properties
    if (objectSchema.properties) {
      const properties = Object.entries(objectSchema.properties);

      // If only a few properties, render inline
      if (properties.length <= 3) {
        return (
          <div className="space-y-4">
            {properties.map(([propName, propSchema]) => {
              const propPath = path ? `${path}.${propName}` : propName;
              const isRequired = objectSchema.required?.includes(propName) || false;
              return (
                <SchemaFormRenderer
                  key={propPath}
                  schema={propSchema}
                  path={propPath}
                  rootSchema={rootSchema}
                  required={isRequired}
                />
              );
            })}
          </div>
        );
      }

      // Many properties - render in collapsible card
      return (
        <NestedObjectField field={fieldMeta} path={path} defaultOpen={false}>
          <div className="space-y-4">
            {properties.map(([propName, propSchema]) => {
              const propPath = path ? `${path}.${propName}` : propName;
              const isRequired = objectSchema.required?.includes(propName) || false;
              return (
                <SchemaFormRenderer
                  key={propPath}
                  schema={propSchema}
                  path={propPath}
                  rootSchema={rootSchema}
                  required={isRequired}
                />
              );
            })}
          </div>
        </NestedObjectField>
      );
    }
  }

  // Unknown type
  return (
    <div className="text-sm text-muted-foreground italic">
      Unsupported field type: {type}
    </div>
  );
}

/**
 * Render multiple fields from an object schema
 */
export interface RenderFieldsProps {
  schema: ObjectSchema;
  basePath?: string;
  rootSchema?: ConfigSchema;
}

export function RenderFields({
  schema,
  basePath = "",
  rootSchema,
}: RenderFieldsProps) {
  if (!schema.properties) {
    return null;
  }

  const properties = Object.entries(schema.properties);

  return (
    <div className="space-y-6">
      {properties.map(([propName, propSchema]) => {
        const path = basePath ? `${basePath}.${propName}` : propName;
        const isRequired = schema.required?.includes(propName) || false;
        return (
          <SchemaFormRenderer
            key={path}
            schema={propSchema}
            path={path}
            rootSchema={rootSchema}
            required={isRequired}
          />
        );
      })}
    </div>
  );
}