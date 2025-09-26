/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import chalk from "chalk";
import merge from "lodash/merge";

import { SchemaObject } from "./types";
import { mergeAllOf } from "../markdown/createSchema";

interface OASTypeToTypeMap {
  string: string;
  number: number;
  integer: number;
  boolean: boolean;
  object: any;
  array: any[];
  null: string | null;
}

type Primitives = {
  [OASType in keyof OASTypeToTypeMap]: {
    [format: string]: (schema: SchemaObject) => OASTypeToTypeMap[OASType];
  };
};

const primitives: Primitives = {
  string: {
    default: () => "string",
    email: () => "user@example.com",
    date: () => "2024-07-29",
    "date-time": () => "2024-07-29T15:51:28.071Z",
    uuid: () => "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    hostname: () => "example.com",
    ipv4: () => "198.51.100.42",
    ipv6: () => "2001:0db8:5b96:0000:0000:426f:8e17:642a",
  },
  number: {
    default: () => 0,
    float: () => 0.0,
  },
  integer: {
    default: () => 0,
  },
  boolean: {
    default: (schema) =>
      typeof schema.default === "boolean" ? schema.default : true,
  },
  object: {},
  array: {},
  null: {
    default: () => "null",
  },
};

type ExampleType = "request" | "response";

interface ExampleContext {
  type: ExampleType;
}

function shouldExcludeProperty(
  prop: SchemaObject,
  context: ExampleContext
): boolean {
  if (prop.deprecated) {
    return true;
  }

  if (context.type === "request") {
    return prop.readOnly === true;
  } else {
    return prop.writeOnly === true;
  }
}

function sampleFromProp(
  name: string,
  prop: any,
  obj: any,
  context: ExampleContext
): any {
  // Handle resolved circular props
  if (typeof prop === "object" && Object.keys(prop).length === 0) {
    obj[name] = prop;
    return obj;
  }

  // TODO: handle discriminators

  if (prop.oneOf) {
    obj[name] = sampleFromSchema(prop.oneOf[0], context);
  } else if (prop.anyOf) {
    obj[name] = sampleFromSchema(prop.anyOf[0], context);
  } else if (prop.allOf) {
    const mergedSchemas = mergeAllOf(prop) as SchemaObject;
    sampleFromProp(name, mergedSchemas, obj, context);
  } else {
    obj[name] = sampleFromSchema(prop, context);
  }
  return obj;
}

export const sampleFromSchema = (
  schema: SchemaObject = {},
  context: ExampleContext
): any => {
  try {
    // deep copy schema before processing
    let schemaCopy = JSON.parse(JSON.stringify(schema));
    let { type, example, allOf, properties, items, oneOf, anyOf } = schemaCopy;

    if (example !== undefined) {
      return example;
    }

    if (oneOf) {
      if (properties) {
        const combinedSchemas = merge(schemaCopy, oneOf[0]);
        delete combinedSchemas.oneOf;
        return sampleFromSchema(combinedSchemas, context);
      }
      // Just go with first schema
      return sampleFromSchema(oneOf[0], context);
    }

    if (anyOf) {
      if (properties) {
        const combinedSchemas = merge(schemaCopy, anyOf[0]);
        delete combinedSchemas.anyOf;
        return sampleFromSchema(combinedSchemas, context);
      }
      // Just go with first schema
      return sampleFromSchema(anyOf[0], context);
    }

    if (allOf) {
      const mergedSchemas = mergeAllOf(schemaCopy) as SchemaObject;
      if (mergedSchemas.properties) {
        for (const [key, value] of Object.entries(mergedSchemas.properties)) {
          if (shouldExcludeProperty(value, context)) {
            delete mergedSchemas.properties[key];
          }
        }
      }
      if (properties) {
        const combinedSchemas = merge(schemaCopy, mergedSchemas);
        delete combinedSchemas.allOf;
        return sampleFromSchema(combinedSchemas, context);
      }
      return sampleFromSchema(mergedSchemas, context);
    }

    if (!type) {
      if (properties) {
        type = "object";
      } else if (items) {
        type = "array";
      } else {
        return;
      }
    }

    if (type === "object") {
      let obj: any = {};
      for (let [name, prop] of Object.entries(properties ?? {}) as any) {
        if (prop.properties) {
          for (const [key, value] of Object.entries(prop.properties) as any) {
            if (shouldExcludeProperty(value, context)) {
              delete prop.properties[key];
            }
          }
        }

        if (prop.items && prop.items.properties) {
          for (const [key, value] of Object.entries(
            prop.items.properties
          ) as any) {
            if (shouldExcludeProperty(value, context)) {
              delete prop.items.properties[key];
            }
          }
        }

        if (shouldExcludeProperty(prop, context)) {
          continue;
        }

        // Resolve schema from prop recursively
        obj = sampleFromProp(name, prop, obj, context);
      }
      return obj;
    }

    if (type === "array") {
      if (Array.isArray(items?.anyOf)) {
        return processArrayItems(items, "anyOf", context);
      }

      if (Array.isArray(items?.oneOf)) {
        return processArrayItems(items, "oneOf", context);
      }

      return normalizeArray(sampleFromSchema(items, context));
    }

    if (schemaCopy.enum) {
      if (schemaCopy.default) {
        return schemaCopy.default;
      }
      return normalizeArray(schemaCopy.enum)[0];
    }

    if (shouldExcludeProperty(schemaCopy, context)) {
      return undefined;
    }

    return primitive(schemaCopy);
  } catch (err) {
    console.error(
      chalk.yellow("WARNING: failed to create example from schema object:", err)
    );
    return;
  }
};

function primitive(schema: SchemaObject = {}) {
  let { type, format } = schema;

  if (type === undefined) {
    return;
  }

  // If type is an array, use the first type
  if (Array.isArray(type)) {
    type = type[0];
    if (type === undefined) {
      return;
    }
  }

  // Use schema default if available, otherwise use type default
  if (schema.default !== undefined) {
    return schema.default;
  }

  const typeConfig = primitives[type];
  if (typeConfig) {
    if (format !== undefined && typeConfig[format] !== undefined) {
      return typeConfig[format](schema);
    }
    if (typeConfig.default !== undefined) {
      return typeConfig.default(schema);
    }
  }

  return "Unknown Type: " + schema.type;
}

function normalizeArray(arr: any) {
  if (Array.isArray(arr)) {
    return arr;
  }
  return [arr];
}

function processArrayItems(
  items: SchemaObject,
  schemaType: "anyOf" | "oneOf",
  context: ExampleContext
): any[] {
  const itemsArray = items[schemaType] as SchemaObject[];
  return itemsArray.map((item: SchemaObject) => {
    // If items has properties, merge them with each item
    if (items.properties) {
      const combinedSchema = {
        ...item,
        properties: {
          ...items.properties, // Common properties from parent
          ...item.properties, // Specific properties from this anyOf/oneOf item
        },
      };
      // Remove anyOf/oneOf to prevent infinite recursion when calling sampleFromSchema
      delete combinedSchema[schemaType];
      return sampleFromSchema(combinedSchema, context);
    }
    return sampleFromSchema(item, context);
  });
}
