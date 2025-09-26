/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

// @ts-nocheck

import { dirname } from "path";

import {
  isNumeric,
  removeQueryString,
  resolveUrl,
  isArray,
  isBoolean,
} from "./helpers";
import { OpenAPIParser } from "../services/OpenAPIParser";
import {
  OpenAPIEncoding,
  OpenAPIMediaType,
  OpenAPIParameter,
  OpenAPIParameterStyle,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPISchema,
  OpenAPIServer,
  Referenced,
} from "../types";

function isWildcardStatusCode(
  statusCode: string | number
): statusCode is string {
  return typeof statusCode === "string" && /\dxx/i.test(statusCode);
}

export function isStatusCode(statusCode: string) {
  return (
    statusCode === "default" ||
    isNumeric(statusCode) ||
    isWildcardStatusCode(statusCode)
  );
}

export function getStatusCodeType(
  statusCode: string | number,
  defaultAsError = false
): string {
  if (statusCode === "default") {
    return defaultAsError ? "error" : "success";
  }

  let code =
    typeof statusCode === "string" ? parseInt(statusCode, 10) : statusCode;
  if (isWildcardStatusCode(statusCode)) {
    code *= 100; // parseInt('2xx') parses to 2
  }

  if (code < 100 || code > 599) {
    throw new Error("invalid HTTP code");
  }
  let res = "success";
  if (code >= 300 && code < 400) {
    res = "redirect";
  } else if (code >= 400) {
    res = "error";
  } else if (code < 200) {
    res = "info";
  }
  return res;
}

const operationNames = {
  get: true,
  post: true,
  put: true,
  head: true,
  patch: true,
  delete: true,
  options: true,
  $ref: true,
};

export function isOperationName(key: string): boolean {
  return key in operationNames;
}

export function getOperationSummary(operation: any): string {
  return (
    operation.summary ||
    operation.operationId ||
    (operation.description && operation.description.substring(0, 50)) ||
    operation.pathName ||
    "<no summary>"
  );
}

const schemaKeywordTypes = {
  multipleOf: "number",
  maximum: "number",
  exclusiveMaximum: "number",
  minimum: "number",
  exclusiveMinimum: "number",

  maxLength: "string",
  minLength: "string",
  pattern: "string",
  contentEncoding: "string",
  contentMediaType: "string",

  items: "array",
  maxItems: "array",
  minItems: "array",
  uniqueItems: "array",

  maxProperties: "object",
  minProperties: "object",
  required: "object",
  additionalProperties: "object",
  unevaluatedProperties: "object",
  properties: "object",
  patternProperties: "object",
};

export function detectType(schema: OpenAPISchema): string {
  if (schema.type !== undefined && !isArray(schema.type)) {
    return schema.type;
  }
  const keywords = Object.keys(schemaKeywordTypes);
  for (const keyword of keywords) {
    const type = schemaKeywordTypes[keyword];
    if (schema[keyword] !== undefined) {
      return type;
    }
  }

  return "any";
}

export function isPrimitiveType(
  schema: OpenAPISchema,
  type: string | string[] | undefined = schema.type
) {
  if (schema.oneOf !== undefined || schema.anyOf !== undefined) {
    return false;
  }

  if ((schema.if && schema.then) || (schema.if && schema.else)) {
    return false;
  }

  let isPrimitive = true;
  const isArrayType = isArray(type);

  if (type === "object" || (isArrayType && type?.includes("object"))) {
    isPrimitive =
      schema.properties !== undefined
        ? Object.keys(schema.properties).length === 0
        : schema.additionalProperties === undefined &&
          schema.unevaluatedProperties === undefined;
  }

  if (isArray(schema.items) || isArray(schema.prefixItems)) {
    return false;
  }

  if (
    schema.items !== undefined &&
    !isBoolean(schema.items) &&
    (type === "array" || (isArrayType && type?.includes("array")))
  ) {
    isPrimitive = isPrimitiveType(schema.items, schema.items.type);
  }

  return isPrimitive;
}

export function isJsonLike(contentType: string): boolean {
  return contentType.search(/json/i) !== -1;
}

export function isFormUrlEncoded(contentType: string): boolean {
  return contentType === "application/x-www-form-urlencoded";
}

function delimitedEncodeField(
  fieldVal: any,
  fieldName: string,
  delimiter: string
): string {
  if (isArray(fieldVal)) {
    return fieldVal.map((v) => v.toString()).join(delimiter);
  } else if (typeof fieldVal === "object") {
    return Object.keys(fieldVal)
      .map((k) => `${k}${delimiter}${fieldVal[k]}`)
      .join(delimiter);
  } else {
    return fieldName + "=" + fieldVal.toString();
  }
}

function deepObjectEncodeField(fieldVal: any, fieldName: string): string {
  if (isArray(fieldVal)) {
    console.warn(
      "deepObject style cannot be used with array value:" + fieldVal.toString()
    );
    return "";
  } else if (typeof fieldVal === "object") {
    return Object.keys(fieldVal)
      .map((k) => `${fieldName}[${k}]=${fieldVal[k]}`)
      .join("&");
  } else {
    console.warn(
      "deepObject style cannot be used with non-object value:" +
        fieldVal.toString()
    );
    return "";
  }
}

function serializeFormValue(name: string, explode: boolean, value: any) {
  // Use RFC6570 safe name ([a-zA-Z0-9_]) and replace with our name later
  // e.g. URI.template doesn't parse names with hyphen (-) which are valid query param names
  const safeName = "__redoc_param_name__";
  const suffix = explode ? "*" : "";
  const template = `{?${safeName}${suffix}}`;
  return template
    .expand({ [safeName]: value })
    .substring(1)
    .replace(/__redoc_param_name__/g, name);
}

/*
 * Should be used only for url-form-encoded body payloads
 * To be used for parameters should be extended with other style values
 */
export function urlFormEncodePayload(
  payload: object,
  encoding: { [field: string]: OpenAPIEncoding } = {}
) {
  if (isArray(payload)) {
    throw new Error("Payload must have fields: " + payload.toString());
  } else {
    return Object.keys(payload)
      .map((fieldName) => {
        const fieldVal = payload[fieldName];
        const { style = "form", explode = true } = encoding[fieldName] || {};
        switch (style) {
          case "form":
            return serializeFormValue(fieldName, explode, fieldVal);
          case "spaceDelimited":
            return delimitedEncodeField(fieldVal, fieldName, "%20");
          case "pipeDelimited":
            return delimitedEncodeField(fieldVal, fieldName, "|");
          case "deepObject":
            return deepObjectEncodeField(fieldVal, fieldName);
          default:
            // TODO implement rest of styles for path parameters
            console.warn("Incorrect or unsupported encoding style: " + style);
            return "";
        }
      })
      .join("&");
  }
}

function serializePathParameter(
  name: string,
  style: OpenAPIParameterStyle,
  explode: boolean,
  value: any
): string {
  const suffix = explode ? "*" : "";
  let prefix = "";

  if (style === "label") {
    prefix = ".";
  } else if (style === "matrix") {
    prefix = ";";
  }

  // Use RFC6570 safe name ([a-zA-Z0-9_]) and replace with our name later
  // e.g. URI.template doesn't parse names with hyphen (-) which are valid query param names
  const safeName = "__redoc_param_name__";
  const template = `{${prefix}${safeName}${suffix}}`;

  return template
    .expand({ [safeName]: value })
    .replace(/__redoc_param_name__/g, name);
}

function serializeQueryParameter(
  name: string,
  style: OpenAPIParameterStyle,
  explode: boolean,
  value: any
): string {
  switch (style) {
    case "form":
      return serializeFormValue(name, explode, value);
    case "spaceDelimited":
      if (!isArray(value)) {
        console.warn("The style spaceDelimited is only applicable to arrays");
        return "";
      }
      if (explode) {
        return serializeFormValue(name, explode, value);
      }

      return `${name}=${value.join("%20")}`;
    case "pipeDelimited":
      if (!isArray(value)) {
        console.warn("The style pipeDelimited is only applicable to arrays");
        return "";
      }
      if (explode) {
        return serializeFormValue(name, explode, value);
      }

      return `${name}=${value.join("|")}`;
    case "deepObject":
      if (!explode || isArray(value) || typeof value !== "object") {
        console.warn(
          "The style deepObject is only applicable for objects with explode=true"
        );
        return "";
      }

      return deepObjectEncodeField(value, name);
    default:
      console.warn("Unexpected style for query: " + style);
      return "";
  }
}

function serializeHeaderParameter(
  style: OpenAPIParameterStyle,
  explode: boolean,
  value: any
): string {
  switch (style) {
    case "simple":
      const suffix = explode ? "*" : "";

      // name is not important here, so use RFC6570 safe name ([a-zA-Z0-9_])
      const name = "__redoc_param_name__";
      const template = `{${name}${suffix}}`;
      return decodeURIComponent(template.expand({ [name]: value }));
    default:
      console.warn("Unexpected style for header: " + style);
      return "";
  }
}

function serializeCookieParameter(
  name: string,
  style: OpenAPIParameterStyle,
  explode: boolean,
  value: any
): string {
  switch (style) {
    case "form":
      return serializeFormValue(name, explode, value);
    default:
      console.warn("Unexpected style for cookie: " + style);
      return "";
  }
}

export function serializeParameterValueWithMime(
  value: any,
  mime: string
): string {
  if (isJsonLike(mime)) {
    return JSON.stringify(value);
  } else {
    console.warn(`Parameter serialization as ${mime} is not supported`);
    return "";
  }
}

export function serializeParameterValue(
  parameter: OpenAPIParameter & { serializationMime?: string },
  value: any
): string {
  const { name, style, explode = false, serializationMime } = parameter;

  if (serializationMime) {
    switch (parameter.in) {
      case "path":
      case "header":
        return serializeParameterValueWithMime(value, serializationMime);
      case "cookie":
      case "query":
        return `${name}=${serializeParameterValueWithMime(
          value,
          serializationMime
        )}`;
      default:
        console.warn("Unexpected parameter location: " + parameter.in);
        return "";
    }
  }

  if (!style) {
    console.warn(`Missing style attribute or content for parameter ${name}`);
    return "";
  }

  switch (parameter.in) {
    case "path":
      return serializePathParameter(name, style, explode, value);
    case "query":
      return serializeQueryParameter(name, style, explode, value);
    case "header":
      return serializeHeaderParameter(style, explode, value);
    case "cookie":
      return serializeCookieParameter(name, style, explode, value);
    default:
      console.warn("Unexpected parameter location: " + parameter.in);
      return "";
  }
}

export function getSerializedValue(field: any, example: any) {
  if (field.in) {
    // decode for better readability in examples: see https://github.com/Redocly/redoc/issues/1138
    return decodeURIComponent(serializeParameterValue(field, example));
  } else {
    return example;
  }
}

export function langFromMime(contentType: string): string {
  if (contentType.search(/xml/i) !== -1) {
    return "xml";
  }
  return "clike";
}

const DEFINITION_NAME_REGEX = /^#\/components\/(schemas|pathItems)\/([^/]+)$/;

export function isNamedDefinition(pointer?: string): boolean {
  return DEFINITION_NAME_REGEX.test(pointer || "");
}

export function getDefinitionName(pointer?: string): string | undefined {
  const [name] = pointer?.match(DEFINITION_NAME_REGEX)?.reverse() || [];
  return name;
}

function humanizeMultipleOfConstraint(
  multipleOf: number | undefined
): string | undefined {
  if (multipleOf === undefined) {
    return;
  }
  const strigifiedMultipleOf = multipleOf.toString(10);
  if (!/^0\.0*1$/.test(strigifiedMultipleOf)) {
    return `multiple of ${strigifiedMultipleOf}`;
  }
  return `decimal places <= ${strigifiedMultipleOf.split(".")[1].length}`;
}

function humanizeRangeConstraint(
  description: string,
  min: number | undefined,
  max: number | undefined
): string | undefined {
  let stringRange;
  if (min !== undefined && max !== undefined) {
    if (min === max) {
      stringRange = `= ${min} ${description}`;
    } else {
      stringRange = `[ ${min} .. ${max} ] ${description}`;
    }
  } else if (max !== undefined) {
    stringRange = `<= ${max} ${description}`;
  } else if (min !== undefined) {
    if (min === 1) {
      stringRange = "non-empty";
    } else {
      stringRange = `>= ${min} ${description}`;
    }
  }

  return stringRange;
}

export function humanizeNumberRange(schema: OpenAPISchema): string | undefined {
  const minimum =
    typeof schema.exclusiveMinimum === "number"
      ? Math.min(schema.exclusiveMinimum, schema.minimum ?? Infinity)
      : schema.minimum;
  const maximum =
    typeof schema.exclusiveMaximum === "number"
      ? Math.max(schema.exclusiveMaximum, schema.maximum ?? -Infinity)
      : schema.maximum;
  const exclusiveMinimum =
    typeof schema.exclusiveMinimum === "number" || schema.exclusiveMinimum;
  const exclusiveMaximum =
    typeof schema.exclusiveMaximum === "number" || schema.exclusiveMaximum;

  if (minimum !== undefined && maximum !== undefined) {
    return `${exclusiveMinimum ? "( " : "[ "}${minimum} .. ${maximum}${
      exclusiveMaximum ? " )" : " ]"
    }`;
  } else if (maximum !== undefined) {
    return `${exclusiveMaximum ? "< " : "<= "}${maximum}`;
  } else if (minimum !== undefined) {
    return `${exclusiveMinimum ? "> " : ">= "}${minimum}`;
  }
}

export function humanizeConstraints(schema: OpenAPISchema): string[] {
  const res: string[] = [];

  const stringRange = humanizeRangeConstraint(
    "characters",
    schema.minLength,
    schema.maxLength
  );
  if (stringRange !== undefined) {
    res.push(stringRange);
  }

  const arrayRange = humanizeRangeConstraint(
    "items",
    schema.minItems,
    schema.maxItems
  );
  if (arrayRange !== undefined) {
    res.push(arrayRange);
  }

  const propertiesRange = humanizeRangeConstraint(
    "properties",
    schema.minProperties,
    schema.maxProperties
  );
  if (propertiesRange !== undefined) {
    res.push(propertiesRange);
  }

  const multipleOfConstraint = humanizeMultipleOfConstraint(schema.multipleOf);
  if (multipleOfConstraint !== undefined) {
    res.push(multipleOfConstraint);
  }

  const numberRange = humanizeNumberRange(schema);
  if (numberRange !== undefined) {
    res.push(numberRange);
  }

  if (schema.uniqueItems) {
    res.push("unique");
  }

  return res;
}

export function sortByRequired(fields: any[], order: string[] = []) {
  const unrequiredFields: any[] = [];
  const orderedFields: any[] = [];
  const unorderedFields: any[] = [];

  fields.forEach((field) => {
    if (field.required) {
      order.includes(field.name)
        ? orderedFields.push(field)
        : unorderedFields.push(field);
    } else {
      unrequiredFields.push(field);
    }
  });

  orderedFields.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  return [...orderedFields, ...unorderedFields, ...unrequiredFields];
}

export function sortByField(
  fields: any[],
  param: "name" | "description" | "kind"
) {
  return [...fields].sort((a, b) => {
    return a[param].localeCompare(b[param]);
  });
}

export function mergeParams(
  parser: OpenAPIParser,
  pathParams: Array<Referenced<OpenAPIParameter>> = [],
  operationParams: Array<Referenced<OpenAPIParameter>> = []
): Array<Referenced<OpenAPIParameter>> {
  const operationParamNames = {};
  operationParams.forEach((param) => {
    param = parser.shallowDeref(param);
    operationParamNames[param.name + "_" + param.in] = true;
  });

  // filter out path params overridden by operation ones with the same name
  pathParams = pathParams.filter((param) => {
    param = parser.shallowDeref(param);
    return !operationParamNames[param.name + "_" + param.in];
  });

  return pathParams.concat(operationParams);
}

export function mergeSimilarMediaTypes(
  types: Record<string, OpenAPIMediaType>
): Record<string, OpenAPIMediaType> {
  const mergedTypes = {};
  Object.keys(types).forEach((name) => {
    const mime = types[name];
    // ignore content type parameters (e.g. charset) and merge
    const normalizedMimeName = name.split(";")[0].trim();
    if (!mergedTypes[normalizedMimeName]) {
      mergedTypes[normalizedMimeName] = mime;
      return;
    }
    mergedTypes[normalizedMimeName] = {
      ...mergedTypes[normalizedMimeName],
      ...mime,
    };
  });

  return mergedTypes;
}

export function expandDefaultServerVariables(
  url: string,
  variables: object = {}
) {
  return url.replace(
    /(?:{)([\w-.]+)(?:})/g,
    (match, name) => (variables[name] && variables[name].default) || match
  );
}

export function normalizeServers(
  specUrl: string | undefined,
  servers: OpenAPIServer[]
): OpenAPIServer[] {
  const getHref = () => {
    if (!false) {
      return "";
    }
    const href = window.location.href;
    return href.endsWith(".html") ? dirname(href) : href;
  };

  const baseUrl =
    specUrl === undefined ? removeQueryString(getHref()) : dirname(specUrl);

  if (servers.length === 0) {
    // Behaviour defined in OpenAPI spec: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#openapi-object
    servers = [
      {
        url: "/",
      },
    ];
  }

  function normalizeUrl(url: string): string {
    return resolveUrl(baseUrl, url);
  }

  return servers.map((server) => {
    return {
      ...server,
      url: normalizeUrl(server.url),
      description: server.description || "",
    };
  });
}

export const SECURITY_DEFINITIONS_JSX_NAME = "SecurityDefinitions";
export const SCHEMA_DEFINITION_JSX_NAME = "SchemaDefinition";

export let SECURITY_SCHEMES_SECTION_PREFIX = "section/Authentication/";
export function setSecuritySchemePrefix(prefix: string) {
  SECURITY_SCHEMES_SECTION_PREFIX = prefix;
}

export const shortenHTTPVerb = (verb) =>
  ({
    delete: "del",
    options: "opts",
  })[verb] || verb;

export function isRedocExtension(key: string): boolean {
  const redocExtensions = {
    "x-circular-ref": true,
    "x-code-samples": true, // deprecated
    "x-codeSamples": true,
    "x-displayName": true,
    "x-examples": true,
    "x-ignoredHeaderParameters": true,
    "x-logo": true,
    "x-nullable": true,
    "x-servers": true,
    "x-tagGroups": true,
    "x-traitTag": true,
    "x-additionalPropertiesName": true,
    "x-explicitMappingOnly": true,
  };

  return key in redocExtensions;
}

export function extractExtensions(
  obj: object,
  showExtensions: string[] | true
): Record<string, any> {
  return Object.keys(obj)
    .filter((key) => {
      if (showExtensions === true) {
        return key.startsWith("x-") && !isRedocExtension(key);
      }
      return key.startsWith("x-") && showExtensions.indexOf(key) > -1;
    })
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

export function pluralizeType(displayType: string): string {
  return displayType
    .split(" or ")
    .map((type) =>
      type.replace(
        /^(string|object|number|integer|array|boolean)s?( ?.*)/,
        "$1s$2"
      )
    )
    .join(" or ");
}

export function getContentWithLegacyExamples(
  info: OpenAPIRequestBody | OpenAPIResponse
): { [mime: string]: OpenAPIMediaType } | undefined {
  let mediaContent = info.content;
  const xExamples = info["x-examples"]; // converted from OAS2 body param
  const xExample = info["x-example"]; // converted from OAS2 body param

  if (xExamples) {
    mediaContent = { ...mediaContent };
    for (const mime of Object.keys(xExamples)) {
      const examples = xExamples[mime];
      mediaContent[mime] = {
        ...mediaContent[mime],
        examples,
      };
    }
  } else if (xExample) {
    mediaContent = { ...mediaContent };
    for (const mime of Object.keys(xExample)) {
      const example = xExample[mime];
      mediaContent[mime] = {
        ...mediaContent[mime],
        example,
      };
    }
  }

  return mediaContent;
}
