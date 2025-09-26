"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortenHTTPVerb = exports.SECURITY_SCHEMES_SECTION_PREFIX = exports.SCHEMA_DEFINITION_JSX_NAME = exports.SECURITY_DEFINITIONS_JSX_NAME = void 0;
exports.isStatusCode = isStatusCode;
exports.getStatusCodeType = getStatusCodeType;
exports.isOperationName = isOperationName;
exports.getOperationSummary = getOperationSummary;
exports.detectType = detectType;
exports.isPrimitiveType = isPrimitiveType;
exports.isJsonLike = isJsonLike;
exports.isFormUrlEncoded = isFormUrlEncoded;
exports.urlFormEncodePayload = urlFormEncodePayload;
exports.serializeParameterValueWithMime = serializeParameterValueWithMime;
exports.serializeParameterValue = serializeParameterValue;
exports.getSerializedValue = getSerializedValue;
exports.langFromMime = langFromMime;
exports.isNamedDefinition = isNamedDefinition;
exports.getDefinitionName = getDefinitionName;
exports.humanizeNumberRange = humanizeNumberRange;
exports.humanizeConstraints = humanizeConstraints;
exports.sortByRequired = sortByRequired;
exports.sortByField = sortByField;
exports.mergeParams = mergeParams;
exports.mergeSimilarMediaTypes = mergeSimilarMediaTypes;
exports.expandDefaultServerVariables = expandDefaultServerVariables;
exports.normalizeServers = normalizeServers;
exports.setSecuritySchemePrefix = setSecuritySchemePrefix;
exports.isRedocExtension = isRedocExtension;
exports.extractExtensions = extractExtensions;
exports.pluralizeType = pluralizeType;
exports.getContentWithLegacyExamples = getContentWithLegacyExamples;
// @ts-nocheck
const path_1 = require("path");
const helpers_1 = require("./helpers");
function isWildcardStatusCode(statusCode) {
    return typeof statusCode === "string" && /\dxx/i.test(statusCode);
}
function isStatusCode(statusCode) {
    return (statusCode === "default" ||
        (0, helpers_1.isNumeric)(statusCode) ||
        isWildcardStatusCode(statusCode));
}
function getStatusCodeType(statusCode, defaultAsError = false) {
    if (statusCode === "default") {
        return defaultAsError ? "error" : "success";
    }
    let code = typeof statusCode === "string" ? parseInt(statusCode, 10) : statusCode;
    if (isWildcardStatusCode(statusCode)) {
        code *= 100; // parseInt('2xx') parses to 2
    }
    if (code < 100 || code > 599) {
        throw new Error("invalid HTTP code");
    }
    let res = "success";
    if (code >= 300 && code < 400) {
        res = "redirect";
    }
    else if (code >= 400) {
        res = "error";
    }
    else if (code < 200) {
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
function isOperationName(key) {
    return key in operationNames;
}
function getOperationSummary(operation) {
    return (operation.summary ||
        operation.operationId ||
        (operation.description && operation.description.substring(0, 50)) ||
        operation.pathName ||
        "<no summary>");
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
function detectType(schema) {
    if (schema.type !== undefined && !(0, helpers_1.isArray)(schema.type)) {
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
function isPrimitiveType(schema, type = schema.type) {
    if (schema.oneOf !== undefined || schema.anyOf !== undefined) {
        return false;
    }
    if ((schema.if && schema.then) || (schema.if && schema.else)) {
        return false;
    }
    let isPrimitive = true;
    const isArrayType = (0, helpers_1.isArray)(type);
    if (type === "object" || (isArrayType && (type === null || type === void 0 ? void 0 : type.includes("object")))) {
        isPrimitive =
            schema.properties !== undefined
                ? Object.keys(schema.properties).length === 0
                : schema.additionalProperties === undefined &&
                    schema.unevaluatedProperties === undefined;
    }
    if ((0, helpers_1.isArray)(schema.items) || (0, helpers_1.isArray)(schema.prefixItems)) {
        return false;
    }
    if (schema.items !== undefined &&
        !(0, helpers_1.isBoolean)(schema.items) &&
        (type === "array" || (isArrayType && (type === null || type === void 0 ? void 0 : type.includes("array"))))) {
        isPrimitive = isPrimitiveType(schema.items, schema.items.type);
    }
    return isPrimitive;
}
function isJsonLike(contentType) {
    return contentType.search(/json/i) !== -1;
}
function isFormUrlEncoded(contentType) {
    return contentType === "application/x-www-form-urlencoded";
}
function delimitedEncodeField(fieldVal, fieldName, delimiter) {
    if ((0, helpers_1.isArray)(fieldVal)) {
        return fieldVal.map((v) => v.toString()).join(delimiter);
    }
    else if (typeof fieldVal === "object") {
        return Object.keys(fieldVal)
            .map((k) => `${k}${delimiter}${fieldVal[k]}`)
            .join(delimiter);
    }
    else {
        return fieldName + "=" + fieldVal.toString();
    }
}
function deepObjectEncodeField(fieldVal, fieldName) {
    if ((0, helpers_1.isArray)(fieldVal)) {
        console.warn("deepObject style cannot be used with array value:" + fieldVal.toString());
        return "";
    }
    else if (typeof fieldVal === "object") {
        return Object.keys(fieldVal)
            .map((k) => `${fieldName}[${k}]=${fieldVal[k]}`)
            .join("&");
    }
    else {
        console.warn("deepObject style cannot be used with non-object value:" +
            fieldVal.toString());
        return "";
    }
}
function serializeFormValue(name, explode, value) {
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
function urlFormEncodePayload(payload, encoding = {}) {
    if ((0, helpers_1.isArray)(payload)) {
        throw new Error("Payload must have fields: " + payload.toString());
    }
    else {
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
function serializePathParameter(name, style, explode, value) {
    const suffix = explode ? "*" : "";
    let prefix = "";
    if (style === "label") {
        prefix = ".";
    }
    else if (style === "matrix") {
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
function serializeQueryParameter(name, style, explode, value) {
    switch (style) {
        case "form":
            return serializeFormValue(name, explode, value);
        case "spaceDelimited":
            if (!(0, helpers_1.isArray)(value)) {
                console.warn("The style spaceDelimited is only applicable to arrays");
                return "";
            }
            if (explode) {
                return serializeFormValue(name, explode, value);
            }
            return `${name}=${value.join("%20")}`;
        case "pipeDelimited":
            if (!(0, helpers_1.isArray)(value)) {
                console.warn("The style pipeDelimited is only applicable to arrays");
                return "";
            }
            if (explode) {
                return serializeFormValue(name, explode, value);
            }
            return `${name}=${value.join("|")}`;
        case "deepObject":
            if (!explode || (0, helpers_1.isArray)(value) || typeof value !== "object") {
                console.warn("The style deepObject is only applicable for objects with explode=true");
                return "";
            }
            return deepObjectEncodeField(value, name);
        default:
            console.warn("Unexpected style for query: " + style);
            return "";
    }
}
function serializeHeaderParameter(style, explode, value) {
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
function serializeCookieParameter(name, style, explode, value) {
    switch (style) {
        case "form":
            return serializeFormValue(name, explode, value);
        default:
            console.warn("Unexpected style for cookie: " + style);
            return "";
    }
}
function serializeParameterValueWithMime(value, mime) {
    if (isJsonLike(mime)) {
        return JSON.stringify(value);
    }
    else {
        console.warn(`Parameter serialization as ${mime} is not supported`);
        return "";
    }
}
function serializeParameterValue(parameter, value) {
    const { name, style, explode = false, serializationMime } = parameter;
    if (serializationMime) {
        switch (parameter.in) {
            case "path":
            case "header":
                return serializeParameterValueWithMime(value, serializationMime);
            case "cookie":
            case "query":
                return `${name}=${serializeParameterValueWithMime(value, serializationMime)}`;
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
function getSerializedValue(field, example) {
    if (field.in) {
        // decode for better readability in examples: see https://github.com/Redocly/redoc/issues/1138
        return decodeURIComponent(serializeParameterValue(field, example));
    }
    else {
        return example;
    }
}
function langFromMime(contentType) {
    if (contentType.search(/xml/i) !== -1) {
        return "xml";
    }
    return "clike";
}
const DEFINITION_NAME_REGEX = /^#\/components\/(schemas|pathItems)\/([^/]+)$/;
function isNamedDefinition(pointer) {
    return DEFINITION_NAME_REGEX.test(pointer || "");
}
function getDefinitionName(pointer) {
    var _a;
    const [name] = ((_a = pointer === null || pointer === void 0 ? void 0 : pointer.match(DEFINITION_NAME_REGEX)) === null || _a === void 0 ? void 0 : _a.reverse()) || [];
    return name;
}
function humanizeMultipleOfConstraint(multipleOf) {
    if (multipleOf === undefined) {
        return;
    }
    const strigifiedMultipleOf = multipleOf.toString(10);
    if (!/^0\.0*1$/.test(strigifiedMultipleOf)) {
        return `multiple of ${strigifiedMultipleOf}`;
    }
    return `decimal places <= ${strigifiedMultipleOf.split(".")[1].length}`;
}
function humanizeRangeConstraint(description, min, max) {
    let stringRange;
    if (min !== undefined && max !== undefined) {
        if (min === max) {
            stringRange = `= ${min} ${description}`;
        }
        else {
            stringRange = `[ ${min} .. ${max} ] ${description}`;
        }
    }
    else if (max !== undefined) {
        stringRange = `<= ${max} ${description}`;
    }
    else if (min !== undefined) {
        if (min === 1) {
            stringRange = "non-empty";
        }
        else {
            stringRange = `>= ${min} ${description}`;
        }
    }
    return stringRange;
}
function humanizeNumberRange(schema) {
    var _a, _b;
    const minimum = typeof schema.exclusiveMinimum === "number"
        ? Math.min(schema.exclusiveMinimum, (_a = schema.minimum) !== null && _a !== void 0 ? _a : Infinity)
        : schema.minimum;
    const maximum = typeof schema.exclusiveMaximum === "number"
        ? Math.max(schema.exclusiveMaximum, (_b = schema.maximum) !== null && _b !== void 0 ? _b : -Infinity)
        : schema.maximum;
    const exclusiveMinimum = typeof schema.exclusiveMinimum === "number" || schema.exclusiveMinimum;
    const exclusiveMaximum = typeof schema.exclusiveMaximum === "number" || schema.exclusiveMaximum;
    if (minimum !== undefined && maximum !== undefined) {
        return `${exclusiveMinimum ? "( " : "[ "}${minimum} .. ${maximum}${exclusiveMaximum ? " )" : " ]"}`;
    }
    else if (maximum !== undefined) {
        return `${exclusiveMaximum ? "< " : "<= "}${maximum}`;
    }
    else if (minimum !== undefined) {
        return `${exclusiveMinimum ? "> " : ">= "}${minimum}`;
    }
}
function humanizeConstraints(schema) {
    const res = [];
    const stringRange = humanizeRangeConstraint("characters", schema.minLength, schema.maxLength);
    if (stringRange !== undefined) {
        res.push(stringRange);
    }
    const arrayRange = humanizeRangeConstraint("items", schema.minItems, schema.maxItems);
    if (arrayRange !== undefined) {
        res.push(arrayRange);
    }
    const propertiesRange = humanizeRangeConstraint("properties", schema.minProperties, schema.maxProperties);
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
function sortByRequired(fields, order = []) {
    const unrequiredFields = [];
    const orderedFields = [];
    const unorderedFields = [];
    fields.forEach((field) => {
        if (field.required) {
            order.includes(field.name)
                ? orderedFields.push(field)
                : unorderedFields.push(field);
        }
        else {
            unrequiredFields.push(field);
        }
    });
    orderedFields.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    return [...orderedFields, ...unorderedFields, ...unrequiredFields];
}
function sortByField(fields, param) {
    return [...fields].sort((a, b) => {
        return a[param].localeCompare(b[param]);
    });
}
function mergeParams(parser, pathParams = [], operationParams = []) {
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
function mergeSimilarMediaTypes(types) {
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
function expandDefaultServerVariables(url, variables = {}) {
    return url.replace(/(?:{)([\w-.]+)(?:})/g, (match, name) => (variables[name] && variables[name].default) || match);
}
function normalizeServers(specUrl, servers) {
    const getHref = () => {
        if (!false) {
            return "";
        }
        const href = window.location.href;
        return href.endsWith(".html") ? (0, path_1.dirname)(href) : href;
    };
    const baseUrl = specUrl === undefined ? (0, helpers_1.removeQueryString)(getHref()) : (0, path_1.dirname)(specUrl);
    if (servers.length === 0) {
        // Behaviour defined in OpenAPI spec: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#openapi-object
        servers = [
            {
                url: "/",
            },
        ];
    }
    function normalizeUrl(url) {
        return (0, helpers_1.resolveUrl)(baseUrl, url);
    }
    return servers.map((server) => {
        return {
            ...server,
            url: normalizeUrl(server.url),
            description: server.description || "",
        };
    });
}
exports.SECURITY_DEFINITIONS_JSX_NAME = "SecurityDefinitions";
exports.SCHEMA_DEFINITION_JSX_NAME = "SchemaDefinition";
exports.SECURITY_SCHEMES_SECTION_PREFIX = "section/Authentication/";
function setSecuritySchemePrefix(prefix) {
    exports.SECURITY_SCHEMES_SECTION_PREFIX = prefix;
}
const shortenHTTPVerb = (verb) => ({
    delete: "del",
    options: "opts",
})[verb] || verb;
exports.shortenHTTPVerb = shortenHTTPVerb;
function isRedocExtension(key) {
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
function extractExtensions(obj, showExtensions) {
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
function pluralizeType(displayType) {
    return displayType
        .split(" or ")
        .map((type) => type.replace(/^(string|object|number|integer|array|boolean)s?( ?.*)/, "$1s$2"))
        .join(" or ");
}
function getContentWithLegacyExamples(info) {
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
    }
    else if (xExample) {
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
