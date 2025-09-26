/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { SchemaObject } from "../openapi/types";

function prettyName(schema: SchemaObject, circular?: boolean) {
  if (schema.format) {
    if (schema.type) {
      return `${schema.type}<${schema.format}>`;
    }
    return schema.format;
  }

  if (schema.allOf) {
    if (typeof schema.allOf[0] === "string") {
      // @ts-ignore
      if (schema.allOf[0].includes("circular")) {
        return schema.allOf[0];
      }
    }
    return "object";
  }

  if (schema.oneOf) {
    return "object";
  }

  if (schema.anyOf) {
    return "object";
  }

  if (schema.type === "object") {
    return schema.xml?.name ?? schema.type;
    // return schema.type;
  }

  if (schema.type === "array") {
    return schema.xml?.name ?? schema.type;
    // return schema.type;
  }

  if (schema.title && schema.type) {
    return `${schema.title} (${schema.type})`;
  }

  return schema.title ?? schema.type;
}

export function getSchemaName(
  schema: SchemaObject,
  circular?: boolean
): string {
  if (schema.items) {
    return prettyName(schema.items, circular) + "[]";
  }

  return prettyName(schema, circular) ?? "";
}

export function getQualifierMessage(schema?: SchemaObject): string | undefined {
  // TODO:
  // - uniqueItems
  // - maxProperties
  // - minProperties
  // - multipleOf
  if (!schema) {
    return undefined;
  }

  if (
    schema.items &&
    schema.minItems === undefined &&
    schema.maxItems === undefined
  ) {
    return getQualifierMessage(schema.items);
  }

  let message = "**Possible values:** ";

  let qualifierGroups = [];

  if (schema.items && schema.items.enum) {
    if (schema.items.enum) {
      qualifierGroups.push(
        `[${schema.items.enum.map((e) => `\`${e}\``).join(", ")}]`
      );
    }
  }

  if (schema.minLength || schema.maxLength) {
    let lengthQualifier = "";
    let minLength;
    let maxLength;
    if (schema.minLength && schema.minLength > 1) {
      minLength = `\`>= ${schema.minLength} characters\``;
    }
    if (schema.minLength && schema.minLength === 1) {
      minLength = `\`non-empty\``;
    }
    if (schema.maxLength) {
      maxLength = `\`<= ${schema.maxLength} characters\``;
    }

    if (minLength && !maxLength) {
      lengthQualifier += minLength;
    }
    if (maxLength && !minLength) {
      lengthQualifier += maxLength;
    }
    if (minLength && maxLength) {
      lengthQualifier += `${minLength} and ${maxLength}`;
    }

    qualifierGroups.push(lengthQualifier);
  }

  if (
    schema.minimum != null ||
    schema.maximum != null ||
    typeof schema.exclusiveMinimum === "number" ||
    typeof schema.exclusiveMaximum === "number"
  ) {
    let minmaxQualifier = "";
    let minimum;
    let maximum;
    if (typeof schema.exclusiveMinimum === "number") {
      minimum = `\`> ${schema.exclusiveMinimum}\``;
    } else if (schema.minimum != null && !schema.exclusiveMinimum) {
      minimum = `\`>= ${schema.minimum}\``;
    } else if (schema.minimum != null && schema.exclusiveMinimum === true) {
      minimum = `\`> ${schema.minimum}\``;
    }
    if (typeof schema.exclusiveMaximum === "number") {
      maximum = `\`< ${schema.exclusiveMaximum}\``;
    } else if (schema.maximum != null && !schema.exclusiveMaximum) {
      maximum = `\`<= ${schema.maximum}\``;
    } else if (schema.maximum != null && schema.exclusiveMaximum === true) {
      maximum = `\`< ${schema.maximum}\``;
    }

    if (minimum && !maximum) {
      minmaxQualifier += minimum;
    }
    if (maximum && !minimum) {
      minmaxQualifier += maximum;
    }
    if (minimum && maximum) {
      minmaxQualifier += `${minimum} and ${maximum}`;
    }

    qualifierGroups.push(minmaxQualifier);
  }

  if (schema.pattern) {
    qualifierGroups.push(
      `Value must match regular expression \`${schema.pattern}\``
    );
  }

  // Check if discriminator mapping
  const discriminator = schema as any;
  if (discriminator.mapping) {
    const values = Object.keys(discriminator.mapping);
    qualifierGroups.push(`[${values.map((e) => `\`${e}\``).join(", ")}]`);
  }

  if (schema.enum) {
    qualifierGroups.push(`[${schema.enum.map((e) => `\`${e}\``).join(", ")}]`);
  }

  if (schema.minItems) {
    qualifierGroups.push(`\`>= ${schema.minItems}\``);
  }

  if (schema.maxItems) {
    qualifierGroups.push(`\`<= ${schema.maxItems}\``);
  }

  if (qualifierGroups.length === 0) {
    return undefined;
  }

  return message + qualifierGroups.join(", ");
}
