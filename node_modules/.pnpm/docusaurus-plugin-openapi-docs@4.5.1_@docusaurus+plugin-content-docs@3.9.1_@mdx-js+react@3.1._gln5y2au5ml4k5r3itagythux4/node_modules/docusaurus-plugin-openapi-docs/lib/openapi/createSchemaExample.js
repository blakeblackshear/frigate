"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleFromSchema = void 0;
const chalk_1 = __importDefault(require("chalk"));
const merge_1 = __importDefault(require("lodash/merge"));
const createSchema_1 = require("../markdown/createSchema");
const primitives = {
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
        default: (schema) => typeof schema.default === "boolean" ? schema.default : true,
    },
    object: {},
    array: {},
    null: {
        default: () => "null",
    },
};
function shouldExcludeProperty(prop, context) {
    if (prop.deprecated) {
        return true;
    }
    if (context.type === "request") {
        return prop.readOnly === true;
    }
    else {
        return prop.writeOnly === true;
    }
}
function sampleFromProp(name, prop, obj, context) {
    // Handle resolved circular props
    if (typeof prop === "object" && Object.keys(prop).length === 0) {
        obj[name] = prop;
        return obj;
    }
    // TODO: handle discriminators
    if (prop.oneOf) {
        obj[name] = (0, exports.sampleFromSchema)(prop.oneOf[0], context);
    }
    else if (prop.anyOf) {
        obj[name] = (0, exports.sampleFromSchema)(prop.anyOf[0], context);
    }
    else if (prop.allOf) {
        const mergedSchemas = (0, createSchema_1.mergeAllOf)(prop);
        sampleFromProp(name, mergedSchemas, obj, context);
    }
    else {
        obj[name] = (0, exports.sampleFromSchema)(prop, context);
    }
    return obj;
}
const sampleFromSchema = (schema = {}, context) => {
    try {
        // deep copy schema before processing
        let schemaCopy = JSON.parse(JSON.stringify(schema));
        let { type, example, allOf, properties, items, oneOf, anyOf } = schemaCopy;
        if (example !== undefined) {
            return example;
        }
        if (oneOf) {
            if (properties) {
                const combinedSchemas = (0, merge_1.default)(schemaCopy, oneOf[0]);
                delete combinedSchemas.oneOf;
                return (0, exports.sampleFromSchema)(combinedSchemas, context);
            }
            // Just go with first schema
            return (0, exports.sampleFromSchema)(oneOf[0], context);
        }
        if (anyOf) {
            if (properties) {
                const combinedSchemas = (0, merge_1.default)(schemaCopy, anyOf[0]);
                delete combinedSchemas.anyOf;
                return (0, exports.sampleFromSchema)(combinedSchemas, context);
            }
            // Just go with first schema
            return (0, exports.sampleFromSchema)(anyOf[0], context);
        }
        if (allOf) {
            const mergedSchemas = (0, createSchema_1.mergeAllOf)(schemaCopy);
            if (mergedSchemas.properties) {
                for (const [key, value] of Object.entries(mergedSchemas.properties)) {
                    if (shouldExcludeProperty(value, context)) {
                        delete mergedSchemas.properties[key];
                    }
                }
            }
            if (properties) {
                const combinedSchemas = (0, merge_1.default)(schemaCopy, mergedSchemas);
                delete combinedSchemas.allOf;
                return (0, exports.sampleFromSchema)(combinedSchemas, context);
            }
            return (0, exports.sampleFromSchema)(mergedSchemas, context);
        }
        if (!type) {
            if (properties) {
                type = "object";
            }
            else if (items) {
                type = "array";
            }
            else {
                return;
            }
        }
        if (type === "object") {
            let obj = {};
            for (let [name, prop] of Object.entries(properties !== null && properties !== void 0 ? properties : {})) {
                if (prop.properties) {
                    for (const [key, value] of Object.entries(prop.properties)) {
                        if (shouldExcludeProperty(value, context)) {
                            delete prop.properties[key];
                        }
                    }
                }
                if (prop.items && prop.items.properties) {
                    for (const [key, value] of Object.entries(prop.items.properties)) {
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
            if (Array.isArray(items === null || items === void 0 ? void 0 : items.anyOf)) {
                return processArrayItems(items, "anyOf", context);
            }
            if (Array.isArray(items === null || items === void 0 ? void 0 : items.oneOf)) {
                return processArrayItems(items, "oneOf", context);
            }
            return normalizeArray((0, exports.sampleFromSchema)(items, context));
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
    }
    catch (err) {
        console.error(chalk_1.default.yellow("WARNING: failed to create example from schema object:", err));
        return;
    }
};
exports.sampleFromSchema = sampleFromSchema;
function primitive(schema = {}) {
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
function normalizeArray(arr) {
    if (Array.isArray(arr)) {
        return arr;
    }
    return [arr];
}
function processArrayItems(items, schemaType, context) {
    const itemsArray = items[schemaType];
    return itemsArray.map((item) => {
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
            return (0, exports.sampleFromSchema)(combinedSchema, context);
        }
        return (0, exports.sampleFromSchema)(item, context);
    });
}
