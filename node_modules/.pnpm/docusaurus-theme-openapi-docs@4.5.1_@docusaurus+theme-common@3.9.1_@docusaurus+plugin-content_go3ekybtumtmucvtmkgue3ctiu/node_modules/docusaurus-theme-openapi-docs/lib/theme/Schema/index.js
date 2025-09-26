"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ArrayBrackets_1 = require("@theme/ArrayBrackets");
const Details_1 = __importDefault(require("@theme/Details"));
const DiscriminatorTabs_1 = __importDefault(
  require("@theme/DiscriminatorTabs")
);
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const SchemaItem_1 = __importDefault(require("@theme/SchemaItem"));
const SchemaTabs_1 = __importDefault(require("@theme/SchemaTabs"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
// eslint-disable-next-line import/no-extraneous-dependencies
const allof_merge_1 = require("allof-merge");
const clsx_1 = __importDefault(require("clsx"));
const schema_1 = require("docusaurus-plugin-openapi-docs/lib/markdown/schema");
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
// eslint-disable-next-line import/no-extraneous-dependencies
// const jsonSchemaMergeAllOf = require("json-schema-merge-allof");
const mergeAllOf = (allOf) => {
  const onMergeError = (msg) => {
    console.warn(msg);
  };
  const mergedSchemas = (0, allof_merge_1.merge)(allOf, { onMergeError });
  return mergedSchemas;
};
// Renders string as markdown, useful for descriptions and qualifiers
const MarkdownWrapper = ({ text }) => {
  return react_1.default.createElement(
    "div",
    { style: { marginTop: ".5rem", marginBottom: ".5rem" } },
    react_1.default.createElement(Markdown_1.default, null, text)
  );
};
const Summary = ({ name, schemaName, schema, required }) => {
  const { deprecated, nullable } = schema;
  const isRequired = Array.isArray(required)
    ? required.includes(name)
    : required === true;
  return react_1.default.createElement(
    "summary",
    null,
    react_1.default.createElement(
      "span",
      { className: "openapi-schema__container" },
      react_1.default.createElement(
        "strong",
        {
          className: (0, clsx_1.default)("openapi-schema__property", {
            "openapi-schema__strikethrough": deprecated,
          }),
        },
        name
      ),
      react_1.default.createElement(
        "span",
        { className: "openapi-schema__name" },
        " ",
        schemaName
      ),
      (isRequired || deprecated || nullable) &&
        react_1.default.createElement("span", {
          className: "openapi-schema__divider",
        }),
      nullable &&
        react_1.default.createElement(
          "span",
          { className: "openapi-schema__nullable" },
          "nullable"
        ),
      isRequired &&
        react_1.default.createElement(
          "span",
          { className: "openapi-schema__required" },
          "required"
        ),
      deprecated &&
        react_1.default.createElement(
          "span",
          { className: "openapi-schema__deprecated" },
          "deprecated"
        )
    )
  );
};
const AnyOneOf = ({ schema, schemaType }) => {
  const type = schema.oneOf ? "oneOf" : "anyOf";
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(
      "span",
      { className: "badge badge--info", style: { marginBottom: "1rem" } },
      type
    ),
    react_1.default.createElement(
      SchemaTabs_1.default,
      null,
      schema[type]?.map((anyOneSchema, index) => {
        const label = anyOneSchema.title || anyOneSchema.type;
        return (
          // @ts-ignore
          react_1.default.createElement(
            TabItem_1.default,
            { key: index, label: label, value: `${index}-item-properties` },
            (isPrimitive(anyOneSchema) || anyOneSchema.const) &&
              react_1.default.createElement(SchemaItem_1.default, {
                collapsible: false,
                name: undefined,
                schemaName: anyOneSchema.type,
                qualifierMessage: (0, schema_1.getQualifierMessage)(
                  anyOneSchema
                ),
                schema: anyOneSchema,
                discriminator: false,
                children: null,
              }),
            anyOneSchema.type === "object" &&
              !anyOneSchema.properties &&
              !anyOneSchema.allOf &&
              !anyOneSchema.oneOf &&
              !anyOneSchema.anyOf &&
              react_1.default.createElement(SchemaItem_1.default, {
                collapsible: false,
                name: undefined,
                schemaName: anyOneSchema.type,
                qualifierMessage: (0, schema_1.getQualifierMessage)(
                  anyOneSchema
                ),
                schema: anyOneSchema,
                discriminator: false,
                children: null,
              }),
            anyOneSchema.type === "object" &&
              anyOneSchema.properties &&
              react_1.default.createElement(Properties, {
                schema: anyOneSchema,
                schemaType: schemaType,
              }),
            anyOneSchema.allOf &&
              react_1.default.createElement(SchemaNode, {
                schema: anyOneSchema,
                schemaType: schemaType,
              }),
            anyOneSchema.oneOf &&
              react_1.default.createElement(SchemaNode, {
                schema: anyOneSchema,
                schemaType: schemaType,
              }),
            anyOneSchema.anyOf &&
              react_1.default.createElement(SchemaNode, {
                schema: anyOneSchema,
                schemaType: schemaType,
              }),
            anyOneSchema.items &&
              react_1.default.createElement(Items, {
                schema: anyOneSchema,
                schemaType: schemaType,
              })
          )
        );
      })
    )
  );
};
const Properties = ({ schema, schemaType }) => {
  const discriminator = schema.discriminator;
  if (discriminator && !discriminator.mapping) {
    const anyOneOf = schema.oneOf ?? schema.anyOf ?? {};
    const inferredMapping = {};
    Object.entries(anyOneOf).map(([_, anyOneSchema]) => {
      // ensure discriminated property only renders once
      if (
        schema.properties[discriminator.propertyName] &&
        anyOneSchema.properties[discriminator.propertyName]
      )
        delete anyOneSchema.properties[discriminator.propertyName];
      return (inferredMapping[anyOneSchema.title] = anyOneSchema);
    });
    discriminator["mapping"] = inferredMapping;
  }
  if (Object.keys(schema.properties).length === 0) {
    return react_1.default.createElement(SchemaItem_1.default, {
      collapsible: false,
      name: "",
      required: false,
      schemaName: "object",
      qualifierMessage: undefined,
      schema: {},
    });
  }
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    Object.entries(schema.properties).map(([key, val]) =>
      react_1.default.createElement(SchemaEdge, {
        key: key,
        name: key,
        schema: val,
        required: Array.isArray(schema.required)
          ? schema.required.includes(key)
          : false,
        discriminator: discriminator,
        schemaType: schemaType,
      })
    )
  );
};
const PropertyDiscriminator = ({
  name,
  schemaName,
  schema,
  schemaType,
  discriminator,
  required,
}) => {
  if (!schema) {
    return null;
  }
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(
      "div",
      { className: "openapi-discriminator__item openapi-schema__list-item" },
      react_1.default.createElement(
        "div",
        null,
        react_1.default.createElement(
          "span",
          { className: "openapi-schema__container" },
          react_1.default.createElement(
            "strong",
            {
              className: "openapi-discriminator__name openapi-schema__property",
            },
            name
          ),
          schemaName &&
            react_1.default.createElement(
              "span",
              { className: "openapi-schema__name" },
              " ",
              schemaName
            ),
          required &&
            react_1.default.createElement("span", {
              className: "openapi-schema__divider",
            }),
          required &&
            react_1.default.createElement(
              "span",
              { className: "openapi-schema__required" },
              "required"
            )
        ),
        react_1.default.createElement(
          "div",
          { style: { marginLeft: "1rem" } },
          schema.description &&
            react_1.default.createElement(MarkdownWrapper, {
              text: schema.description,
            }),
          (0, schema_1.getQualifierMessage)(discriminator) &&
            react_1.default.createElement(MarkdownWrapper, {
              text: (0, schema_1.getQualifierMessage)(discriminator),
            })
        ),
        react_1.default.createElement(
          DiscriminatorTabs_1.default,
          { className: "openapi-tabs__discriminator" },
          Object.keys(discriminator.mapping).map((key, index) =>
            // @ts-ignore
            react_1.default.createElement(
              TabItem_1.default,
              { key: index, label: key, value: `${index}-item-discriminator` },
              react_1.default.createElement(SchemaNode, {
                schema: discriminator.mapping[key],
                schemaType: schemaType,
              })
            )
          )
        )
      )
    ),
    schema.properties &&
      Object.entries(schema.properties).map(
        ([key, val]) =>
          key !== discriminator.propertyName &&
          react_1.default.createElement(SchemaEdge, {
            key: key,
            name: key,
            schema: val,
            required: Array.isArray(schema.required)
              ? schema.required.includes(key)
              : false,
            discriminator: false,
            schemaType: schemaType,
          })
      )
  );
};
const DiscriminatorNode = ({ discriminator, schema, schemaType }) => {
  let discriminatedSchemas = {};
  let inferredMapping = {};
  // default to empty object if no parent-level properties exist
  const discriminatorProperty = schema.properties
    ? schema.properties[discriminator.propertyName]
    : {};
  if (schema.allOf) {
    const mergedSchemas = mergeAllOf(schema);
    if (mergedSchemas.oneOf || mergedSchemas.anyOf) {
      discriminatedSchemas = mergedSchemas.oneOf || mergedSchemas.anyOf;
    }
  } else if (schema.oneOf || schema.anyOf) {
    discriminatedSchemas = schema.oneOf || schema.anyOf;
  }
  // Handle case where no mapping is defined
  if (!discriminator.mapping) {
    Object.entries(discriminatedSchemas).forEach(([_, subschema], index) => {
      inferredMapping[subschema.title ?? `PROP${index}`] = subschema;
    });
    discriminator.mapping = inferredMapping;
  }
  // Merge sub schema discriminator property with parent
  Object.keys(discriminator.mapping).forEach((key) => {
    const subSchema = discriminator.mapping[key];
    // Handle discriminated schema with allOf
    let mergedSubSchema = {};
    if (subSchema.allOf) {
      mergedSubSchema = mergeAllOf(subSchema);
    }
    const subProperties = subSchema.properties || mergedSubSchema.properties;
    // Add a safeguard check to avoid referencing subProperties if it's undefined
    if (subProperties && subProperties[discriminator.propertyName]) {
      if (schema.properties) {
        schema.properties[discriminator.propertyName] = {
          ...schema.properties[discriminator.propertyName],
          ...subProperties[discriminator.propertyName],
        };
        if (subSchema.required && !schema.required) {
          schema.required = subSchema.required;
        }
        // Avoid duplicating property
        delete subProperties[discriminator.propertyName];
      } else {
        schema.properties = {};
        schema.properties[discriminator.propertyName] =
          subProperties[discriminator.propertyName];
        // Avoid duplicating property
        delete subProperties[discriminator.propertyName];
      }
    }
  });
  const name = discriminator.propertyName;
  const schemaName = (0, schema_1.getSchemaName)(discriminatorProperty);
  // Default case for discriminator without oneOf/anyOf/allOf
  return react_1.default.createElement(PropertyDiscriminator, {
    name: name,
    schemaName: schemaName,
    schema: schema,
    schemaType: schemaType,
    discriminator: discriminator,
    required: Array.isArray(schema.required)
      ? schema.required.includes(name)
      : schema.required,
  });
};
const AdditionalProperties = ({ schema, schemaType }) => {
  const additionalProperties = schema.additionalProperties;
  if (!additionalProperties) return null;
  // Handle free-form objects
  if (
    additionalProperties === true ||
    (0, isEmpty_1.default)(additionalProperties)
  ) {
    return react_1.default.createElement(SchemaItem_1.default, {
      name: "property name*",
      required: false,
      schemaName: "any",
      qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
      schema: schema,
      collapsible: false,
      discriminator: false,
    });
  }
  // Handle objects, arrays, complex schemas
  if (
    additionalProperties.properties ||
    additionalProperties.items ||
    additionalProperties.allOf ||
    additionalProperties.additionalProperties ||
    additionalProperties.oneOf ||
    additionalProperties.anyOf
  ) {
    const title =
      additionalProperties.title ||
      (0, schema_1.getSchemaName)(additionalProperties);
    const required = schema.required || false;
    return react_1.default.createElement(SchemaNodeDetails, {
      name: "property name*",
      schemaName: title,
      required: required,
      nullable: schema.nullable,
      schema: additionalProperties,
      schemaType: schemaType,
    });
  }
  // Handle primitive types
  if (
    additionalProperties.type === "string" ||
    additionalProperties.type === "boolean" ||
    additionalProperties.type === "integer" ||
    additionalProperties.type === "number" ||
    additionalProperties.type === "object"
  ) {
    const schemaName = (0, schema_1.getSchemaName)(additionalProperties);
    return react_1.default.createElement(SchemaItem_1.default, {
      name: "property name*",
      required: false,
      schemaName: schemaName,
      qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
      schema: additionalProperties,
      collapsible: false,
      discriminator: false,
      children: null,
    });
  }
  // Unknown type
  return null;
};
const SchemaNodeDetails = ({
  name,
  schemaName,
  schema,
  required,
  schemaType,
}) => {
  return react_1.default.createElement(
    SchemaItem_1.default,
    { collapsible: true },
    react_1.default.createElement(
      Details_1.default,
      {
        className: "openapi-markdown__details",
        summary: react_1.default.createElement(Summary, {
          name: name,
          schemaName: schemaName,
          schema: schema,
          required: required,
        }),
      },
      react_1.default.createElement(
        "div",
        { style: { marginLeft: "1rem" } },
        schema.description &&
          react_1.default.createElement(MarkdownWrapper, {
            text: schema.description,
          }),
        (0, schema_1.getQualifierMessage)(schema) &&
          react_1.default.createElement(MarkdownWrapper, {
            text: (0, schema_1.getQualifierMessage)(schema),
          }),
        react_1.default.createElement(SchemaNode, {
          schema: schema,
          schemaType: schemaType,
        })
      )
    )
  );
};
const Items = ({ schema, schemaType }) => {
  // Process schema.items to handle allOf merging
  let itemsSchema = schema.items;
  if (schema.items?.allOf) {
    itemsSchema = mergeAllOf(schema.items);
  }
  // Handle complex schemas with multiple schema types
  const hasOneOfAnyOf = itemsSchema?.oneOf || itemsSchema?.anyOf;
  const hasProperties = itemsSchema?.properties;
  const hasAdditionalProperties = itemsSchema?.additionalProperties;
  if (hasOneOfAnyOf || hasProperties || hasAdditionalProperties) {
    return react_1.default.createElement(
      react_1.default.Fragment,
      null,
      react_1.default.createElement(ArrayBrackets_1.OpeningArrayBracket, null),
      hasOneOfAnyOf &&
        react_1.default.createElement(AnyOneOf, {
          schema: itemsSchema,
          schemaType: schemaType,
        }),
      hasProperties &&
        react_1.default.createElement(Properties, {
          schema: itemsSchema,
          schemaType: schemaType,
        }),
      hasAdditionalProperties &&
        react_1.default.createElement(AdditionalProperties, {
          schema: itemsSchema,
          schemaType: schemaType,
        }),
      react_1.default.createElement(ArrayBrackets_1.ClosingArrayBracket, null)
    );
  }
  // Handles basic types (string, number, integer, boolean, object)
  if (
    itemsSchema?.type === "string" ||
    itemsSchema?.type === "number" ||
    itemsSchema?.type === "integer" ||
    itemsSchema?.type === "boolean" ||
    itemsSchema?.type === "object"
  ) {
    return react_1.default.createElement(
      "div",
      { style: { marginLeft: ".5rem" } },
      react_1.default.createElement(ArrayBrackets_1.OpeningArrayBracket, null),
      react_1.default.createElement(SchemaItem_1.default, {
        collapsible: false,
        name: "", // No name for array items
        schemaName: (0, schema_1.getSchemaName)(itemsSchema),
        qualifierMessage: (0, schema_1.getQualifierMessage)(itemsSchema),
        schema: itemsSchema,
        discriminator: false,
        children: null,
      }),
      react_1.default.createElement(ArrayBrackets_1.ClosingArrayBracket, null)
    );
  }
  // Handles fallback case (use createEdges logic)
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(ArrayBrackets_1.OpeningArrayBracket, null),
    Object.entries(itemsSchema || {}).map(([key, val]) =>
      react_1.default.createElement(SchemaEdge, {
        key: key,
        name: key,
        schema: val,
        schemaType: schemaType,
        required: Array.isArray(schema.required)
          ? schema.required.includes(key)
          : false,
      })
    ),
    react_1.default.createElement(ArrayBrackets_1.ClosingArrayBracket, null)
  );
};
const SchemaEdge = ({ name, schema, required, discriminator, schemaType }) => {
  if (
    (schemaType === "request" && schema.readOnly) ||
    (schemaType === "response" && schema.writeOnly)
  ) {
    return null;
  }
  const schemaName = (0, schema_1.getSchemaName)(schema);
  if (discriminator && discriminator.propertyName === name) {
    return react_1.default.createElement(PropertyDiscriminator, {
      name: name,
      schemaName: schemaName,
      schema: schema,
      schemaType: schemaType,
      discriminator: discriminator,
      required: required,
    });
  }
  if (schema.oneOf || schema.anyOf) {
    // return <AnyOneOf schema={schema} schemaType={schemaType} />;
    return react_1.default.createElement(SchemaNodeDetails, {
      name: name,
      schemaName: schemaName,
      schemaType: schemaType,
      required: required,
      schema: schema,
      nullable: schema.nullable,
    });
  }
  if (schema.properties) {
    return react_1.default.createElement(SchemaNodeDetails, {
      name: name,
      schemaName: schemaName,
      schemaType: schemaType,
      required: required,
      schema: schema,
      nullable: schema.nullable,
    });
  }
  if (schema.additionalProperties) {
    return react_1.default.createElement(SchemaNodeDetails, {
      name: name,
      schemaName: schemaName,
      schemaType: schemaType,
      required: required,
      schema: schema,
      nullable: schema.nullable,
    });
  }
  if (schema.items?.properties) {
    return react_1.default.createElement(SchemaNodeDetails, {
      name: name,
      schemaName: schemaName,
      required: required,
      nullable: schema.nullable,
      schema: schema,
      schemaType: schemaType,
    });
  }
  if (schema.items?.anyOf || schema.items?.oneOf) {
    return react_1.default.createElement(SchemaNodeDetails, {
      name: name,
      schemaName: schemaName,
      required: required,
      nullable: schema.nullable,
      schema: schema,
      schemaType: schemaType,
    });
  }
  if (schema.allOf) {
    // handle circular properties
    if (
      schema.allOf &&
      schema.allOf.length &&
      schema.allOf.length === 1 &&
      typeof schema.allOf[0] === "string"
    ) {
      return react_1.default.createElement(SchemaItem_1.default, {
        collapsible: false,
        name: name,
        required: Array.isArray(required) ? required.includes(name) : required,
        schemaName: schema.allOf[0],
        qualifierMessage: undefined,
        schema: schema.allOf[0],
        discriminator: false,
        children: null,
      });
    }
    const mergedSchemas = mergeAllOf(schema);
    if (
      (schemaType === "request" && mergedSchemas.readOnly) ||
      (schemaType === "response" && mergedSchemas.writeOnly)
    ) {
      return null;
    }
    const mergedSchemaName = (0, schema_1.getSchemaName)(mergedSchemas);
    if (mergedSchemas.oneOf || mergedSchemas.anyOf) {
      return react_1.default.createElement(SchemaNodeDetails, {
        name: name,
        schemaName: mergedSchemaName,
        required: Array.isArray(mergedSchemas.required)
          ? mergedSchemas.required.includes(name)
          : mergedSchemas.required,
        nullable: mergedSchemas.nullable,
        schema: mergedSchemas,
        schemaType: schemaType,
      });
    }
    if (mergedSchemas.properties !== undefined) {
      return react_1.default.createElement(SchemaNodeDetails, {
        name: name,
        schemaName: mergedSchemaName,
        required: Array.isArray(mergedSchemas.required)
          ? mergedSchemas.required.includes(name)
          : mergedSchemas.required,
        nullable: mergedSchemas.nullable,
        schema: mergedSchemas,
        schemaType: schemaType,
      });
    }
    if (mergedSchemas.items?.properties) {
      react_1.default.createElement(SchemaNodeDetails, {
        name: name,
        schemaName: mergedSchemaName,
        required: Array.isArray(mergedSchemas.required)
          ? mergedSchemas.required.includes(name)
          : mergedSchemas.required,
        nullable: mergedSchemas.nullable,
        schema: mergedSchemas,
        schemaType: schemaType,
      });
    }
    return react_1.default.createElement(SchemaItem_1.default, {
      collapsible: false,
      name: name,
      required: Array.isArray(required) ? required.includes(name) : required,
      schemaName: mergedSchemaName,
      qualifierMessage: (0, schema_1.getQualifierMessage)(mergedSchemas),
      schema: mergedSchemas,
      discriminator: false,
      children: null,
    });
  }
  return react_1.default.createElement(SchemaItem_1.default, {
    collapsible: false,
    name: name,
    required: Array.isArray(required) ? required.includes(name) : required,
    schemaName: schemaName,
    qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
    schema: schema,
    discriminator: false,
    children: null,
  });
};
function renderChildren(schema, schemaType) {
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    schema.oneOf &&
      react_1.default.createElement(AnyOneOf, {
        schema: schema,
        schemaType: schemaType,
      }),
    schema.anyOf &&
      react_1.default.createElement(AnyOneOf, {
        schema: schema,
        schemaType: schemaType,
      }),
    schema.properties &&
      react_1.default.createElement(Properties, {
        schema: schema,
        schemaType: schemaType,
      }),
    schema.additionalProperties &&
      react_1.default.createElement(AdditionalProperties, {
        schema: schema,
        schemaType: schemaType,
      }),
    schema.items &&
      react_1.default.createElement(Items, {
        schema: schema,
        schemaType: schemaType,
      })
  );
}
const SchemaNode = ({ schema, schemaType }) => {
  if (
    (schemaType === "request" && schema.readOnly) ||
    (schemaType === "response" && schema.writeOnly)
  ) {
    return null;
  }
  if (schema.discriminator) {
    const { discriminator } = schema;
    return react_1.default.createElement(DiscriminatorNode, {
      discriminator: discriminator,
      schema: schema,
      schemaType: schemaType,
    });
  }
  // Handle allOf, oneOf, anyOf without discriminators
  if (schema.allOf) {
    const mergedSchemas = mergeAllOf(schema);
    if (
      (schemaType === "request" && mergedSchemas.readOnly) ||
      (schemaType === "response" && mergedSchemas.writeOnly)
    ) {
      return null;
    }
    return react_1.default.createElement(
      "div",
      null,
      mergedSchemas.oneOf &&
        react_1.default.createElement(AnyOneOf, {
          schema: mergedSchemas,
          schemaType: schemaType,
        }),
      mergedSchemas.anyOf &&
        react_1.default.createElement(AnyOneOf, {
          schema: mergedSchemas,
          schemaType: schemaType,
        }),
      mergedSchemas.properties &&
        react_1.default.createElement(Properties, {
          schema: mergedSchemas,
          schemaType: schemaType,
        }),
      mergedSchemas.items &&
        react_1.default.createElement(Items, {
          schema: mergedSchemas,
          schemaType: schemaType,
        })
    );
  }
  // Handle primitives
  if (
    schema.type &&
    !schema.oneOf &&
    !schema.anyOf &&
    !schema.properties &&
    !schema.allOf &&
    !schema.items &&
    !schema.additionalProperties
  ) {
    const schemaName = (0, schema_1.getSchemaName)(schema);
    return react_1.default.createElement(SchemaItem_1.default, {
      collapsible: false,
      name: schema.type,
      required: Boolean(schema.required),
      schemaName: schemaName,
      qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
      schema: schema,
      discriminator: false,
      children: null,
    });
  }
  return renderChildren(schema, schemaType);
};
exports.default = SchemaNode;
const PRIMITIVE_TYPES = {
  string: true,
  number: true,
  integer: true,
  boolean: true,
  null: true,
};
const isPrimitive = (schema) => {
  return PRIMITIVE_TYPES[schema.type];
};
