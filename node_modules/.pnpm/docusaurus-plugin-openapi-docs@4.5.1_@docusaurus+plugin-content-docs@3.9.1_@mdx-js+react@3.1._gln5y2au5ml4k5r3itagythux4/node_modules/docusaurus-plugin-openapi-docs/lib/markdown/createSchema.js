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
exports.mergeAllOf = mergeAllOf;
exports.createNodes = createNodes;
// eslint-disable-next-line import/no-extraneous-dependencies
const allof_merge_1 = require("allof-merge");
const clsx_1 = __importDefault(require("clsx"));
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const createArrayBracket_1 = require("./createArrayBracket");
const createDescription_1 = require("./createDescription");
const createDetails_1 = require("./createDetails");
const createDetailsSummary_1 = require("./createDetailsSummary");
const schema_1 = require("./schema");
const utils_1 = require("./utils");
let SCHEMA_TYPE;
/**
 * Returns a merged representation of allOf array of schemas.
 */
function mergeAllOf(allOf) {
    const onMergeError = (msg) => {
        console.warn(msg);
    };
    const mergedSchemas = (0, allof_merge_1.merge)(allOf, { onMergeError });
    return mergedSchemas;
}
/**
 * For handling nested anyOf/oneOf.
 */
function createAnyOneOf(schema) {
    const type = schema.oneOf ? "oneOf" : "anyOf";
    return (0, utils_1.create)("div", {
        children: [
            (0, utils_1.create)("span", {
                className: "badge badge--info",
                children: type,
                style: { marginBottom: "1rem" },
            }),
            (0, utils_1.create)("SchemaTabs", {
                children: schema[type].map((anyOneSchema, index) => {
                    const label = anyOneSchema.title
                        ? anyOneSchema.title
                        : `MOD${index + 1}`;
                    const anyOneChildren = [];
                    if (anyOneSchema.description) {
                        anyOneChildren.push((0, utils_1.create)("div", {
                            style: { marginTop: ".5rem", marginBottom: ".5rem" },
                            className: "openapi-schema__summary",
                            children: (0, createDescription_1.createDescription)(anyOneSchema.description),
                        }));
                    }
                    if (anyOneSchema.type === "object" &&
                        !anyOneSchema.properties &&
                        !anyOneSchema.allOf &&
                        !anyOneSchema.items) {
                        anyOneChildren.push(createNodes(anyOneSchema, SCHEMA_TYPE));
                    }
                    if (anyOneSchema.properties !== undefined) {
                        anyOneChildren.push(createProperties(anyOneSchema));
                        delete anyOneSchema.properties;
                    }
                    if (anyOneSchema.allOf !== undefined) {
                        anyOneChildren.push(createNodes(anyOneSchema, SCHEMA_TYPE));
                        delete anyOneSchema.allOf;
                    }
                    if (anyOneSchema.oneOf !== undefined) {
                        anyOneChildren.push(createNodes(anyOneSchema, SCHEMA_TYPE));
                        delete anyOneSchema.oneOf;
                    }
                    if (anyOneSchema.items !== undefined) {
                        anyOneChildren.push(createItems(anyOneSchema));
                        delete anyOneSchema.items;
                    }
                    if (anyOneSchema.type === "string" ||
                        anyOneSchema.type === "number" ||
                        anyOneSchema.type === "integer" ||
                        anyOneSchema.type === "boolean") {
                        anyOneChildren.push(createNodes(anyOneSchema, SCHEMA_TYPE));
                    }
                    if (anyOneChildren.length) {
                        if (schema.type === "array") {
                            return (0, utils_1.create)("TabItem", {
                                label: label,
                                value: `${index}-item-properties`,
                                children: [
                                    (0, createArrayBracket_1.createOpeningArrayBracket)(),
                                    anyOneChildren,
                                    (0, createArrayBracket_1.createClosingArrayBracket)(),
                                ]
                                    .filter(Boolean)
                                    .flat(),
                            });
                        }
                        return (0, utils_1.create)("TabItem", {
                            label: label,
                            value: `${index}-item-properties`,
                            children: anyOneChildren.filter(Boolean).flat(),
                        });
                    }
                    return undefined;
                }),
            }),
        ],
    });
}
/**
 * For handling properties.
 */
function createProperties(schema) {
    const discriminator = schema.discriminator;
    if (Object.keys(schema.properties).length === 0) {
        return (0, utils_1.create)("SchemaItem", {
            collapsible: false,
            name: "",
            required: false,
            schemaName: "object",
            qualifierMessage: undefined,
            schema: {},
        });
    }
    return Object.entries(schema.properties).map(([key, val]) => {
        return createEdges({
            name: key,
            schema: val,
            required: Array.isArray(schema.required)
                ? schema.required.includes(key)
                : false,
            discriminator,
        });
    });
}
/**
 * For handling additionalProperties.
 */
function createAdditionalProperties(schema) {
    var _a;
    const additionalProperties = schema.additionalProperties;
    if (!additionalProperties)
        return [];
    // Handle free-form objects
    if (additionalProperties === true || (0, isEmpty_1.default)(additionalProperties)) {
        return (0, utils_1.create)("SchemaItem", {
            name: "property name*",
            required: false,
            schemaName: "any",
            qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
            schema: schema,
            collapsible: false,
            discriminator: false,
        });
    }
    // objects, arrays, complex schemas
    if (additionalProperties.properties ||
        additionalProperties.items ||
        additionalProperties.allOf ||
        additionalProperties.additionalProperties ||
        additionalProperties.oneOf ||
        additionalProperties.anyOf) {
        const title = additionalProperties.title;
        const schemaName = (0, schema_1.getSchemaName)(additionalProperties);
        const required = (_a = schema.required) !== null && _a !== void 0 ? _a : false;
        return createDetailsNode("property name*", title !== null && title !== void 0 ? title : schemaName, additionalProperties, required, schema.nullable);
    }
    // primitive types
    if (additionalProperties.type === "string" ||
        additionalProperties.type === "boolean" ||
        additionalProperties.type === "integer" ||
        additionalProperties.type === "number") {
        const schemaName = (0, schema_1.getSchemaName)(additionalProperties);
        return (0, utils_1.create)("SchemaItem", {
            name: "property name*",
            required: false,
            schemaName: schemaName,
            qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
            schema: additionalProperties,
            collapsible: false,
            discriminator: false,
        });
    }
    // unknown
    return [];
}
/**
 * For handling items.
 */
function createItems(schema) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (((_a = schema.items) === null || _a === void 0 ? void 0 : _a.properties) !== undefined) {
        return [
            (0, createArrayBracket_1.createOpeningArrayBracket)(),
            createProperties(schema.items),
            (0, createArrayBracket_1.createClosingArrayBracket)(),
        ].flat();
    }
    if (((_b = schema.items) === null || _b === void 0 ? void 0 : _b.additionalProperties) !== undefined) {
        return [
            (0, createArrayBracket_1.createOpeningArrayBracket)(),
            createAdditionalProperties(schema.items),
            (0, createArrayBracket_1.createClosingArrayBracket)(),
        ].flat();
    }
    if (((_c = schema.items) === null || _c === void 0 ? void 0 : _c.oneOf) !== undefined || ((_d = schema.items) === null || _d === void 0 ? void 0 : _d.anyOf) !== undefined) {
        return [
            (0, createArrayBracket_1.createOpeningArrayBracket)(),
            createAnyOneOf(schema.items),
            (0, createArrayBracket_1.createClosingArrayBracket)(),
        ].flat();
    }
    if (((_e = schema.items) === null || _e === void 0 ? void 0 : _e.allOf) !== undefined) {
        // TODO: figure out if and how we should pass merged required array
        const mergedSchemas = mergeAllOf(schema.items);
        // Handles combo anyOf/oneOf + properties
        if ((mergedSchemas.oneOf !== undefined ||
            mergedSchemas.anyOf !== undefined) &&
            mergedSchemas.properties) {
            return [
                (0, createArrayBracket_1.createOpeningArrayBracket)(),
                createAnyOneOf(mergedSchemas),
                createProperties(mergedSchemas),
                (0, createArrayBracket_1.createClosingArrayBracket)(),
            ].flat();
        }
        // Handles only anyOf/oneOf
        if (mergedSchemas.oneOf !== undefined ||
            mergedSchemas.anyOf !== undefined) {
            return [
                (0, createArrayBracket_1.createOpeningArrayBracket)(),
                createAnyOneOf(mergedSchemas),
                (0, createArrayBracket_1.createClosingArrayBracket)(),
            ].flat();
        }
        // Handles properties
        if (mergedSchemas.properties !== undefined) {
            return [
                (0, createArrayBracket_1.createOpeningArrayBracket)(),
                createProperties(mergedSchemas),
                (0, createArrayBracket_1.createClosingArrayBracket)(),
            ].flat();
        }
    }
    if (((_f = schema.items) === null || _f === void 0 ? void 0 : _f.type) === "string" ||
        ((_g = schema.items) === null || _g === void 0 ? void 0 : _g.type) === "number" ||
        ((_h = schema.items) === null || _h === void 0 ? void 0 : _h.type) === "integer" ||
        ((_j = schema.items) === null || _j === void 0 ? void 0 : _j.type) === "boolean" ||
        ((_k = schema.items) === null || _k === void 0 ? void 0 : _k.type) === "object") {
        return [
            (0, createArrayBracket_1.createOpeningArrayBracket)(),
            createNodes(schema.items, SCHEMA_TYPE),
            (0, createArrayBracket_1.createClosingArrayBracket)(),
        ].flat();
    }
    // TODO: clean this up or eliminate it?
    return [
        (0, createArrayBracket_1.createOpeningArrayBracket)(),
        Object.entries(schema.items).map(([key, val]) => createEdges({
            name: key,
            schema: val,
            required: Array.isArray(schema.required)
                ? schema.required.includes(key)
                : false,
        })),
        (0, createArrayBracket_1.createClosingArrayBracket)(),
    ].flat();
}
/**
 * For handling nested properties.
 */
function createDetailsNode(name, schemaName, schema, required, nullable) {
    return (0, utils_1.create)("SchemaItem", {
        collapsible: true,
        className: "schemaItem",
        children: [
            (0, createDetails_1.createDetails)({
                className: "openapi-markdown__details",
                children: [
                    (0, createDetailsSummary_1.createDetailsSummary)({
                        children: [
                            (0, utils_1.create)("span", {
                                className: "openapi-schema__container",
                                children: [
                                    (0, utils_1.create)("strong", {
                                        className: (0, clsx_1.default)("openapi-schema__property", {
                                            "openapi-schema__strikethrough": schema.deprecated,
                                        }),
                                        children: name,
                                    }),
                                    (0, utils_1.create)("span", {
                                        className: "openapi-schema__name",
                                        children: ` ${schemaName}`,
                                    }),
                                    (0, utils_1.guard)((Array.isArray(required)
                                        ? required.includes(name)
                                        : required === true) ||
                                        schema.deprecated ||
                                        nullable, () => [
                                        (0, utils_1.create)("span", {
                                            className: "openapi-schema__divider",
                                        }),
                                    ]),
                                    (0, utils_1.guard)(nullable, () => [
                                        (0, utils_1.create)("span", {
                                            className: "openapi-schema__nullable",
                                            children: "nullable",
                                        }),
                                    ]),
                                    (0, utils_1.guard)(Array.isArray(required)
                                        ? required.includes(name)
                                        : required === true, () => [
                                        (0, utils_1.create)("span", {
                                            className: "openapi-schema__required",
                                            children: "required",
                                        }),
                                    ]),
                                    (0, utils_1.guard)(schema.deprecated, () => [
                                        (0, utils_1.create)("span", {
                                            className: "openapi-schema__deprecated",
                                            children: "deprecated",
                                        }),
                                    ]),
                                ],
                            }),
                        ],
                    }),
                    (0, utils_1.create)("div", {
                        style: { marginLeft: "1rem" },
                        children: [
                            (0, utils_1.guard)(schema.description, (description) => (0, utils_1.create)("div", {
                                style: { marginTop: ".5rem", marginBottom: ".5rem" },
                                children: (0, createDescription_1.createDescription)(description),
                            })),
                            (0, utils_1.guard)((0, schema_1.getQualifierMessage)(schema), (message) => (0, utils_1.create)("div", {
                                style: { marginTop: ".5rem", marginBottom: ".5rem" },
                                children: (0, createDescription_1.createDescription)(message),
                            })),
                            createNodes(schema, SCHEMA_TYPE),
                        ],
                    }),
                ],
            }),
        ],
    });
}
/**
 * For handling anyOf/oneOf properties.
 */
// function createAnyOneOfProperty(
//   name: string,
//   schemaName: string,
//   schema: SchemaObject,
//   required: string[] | boolean,
//   nullable: boolean | unknown
// ): any {
//   return create("SchemaItem", {
//     collapsible: true,
//     className: "schemaItem",
//     children: [
//       createDetails({
//         className: "openapi-markdown__details",
//         children: [
//           createDetailsSummary({
//             children: [
//               create("strong", { children: name }),
//               create("span", {
//                 style: { opacity: "0.6" },
//                 children: ` ${schemaName}`,
//               }),
//               guard(
//                 (schema.nullable && schema.nullable === true) ||
//                   (nullable && nullable === true),
//                 () => [
//                   create("strong", {
//                     style: {
//                       fontSize: "var(--ifm-code-font-size)",
//                       color: "var(--openapi-nullable)",
//                     },
//                     children: " nullable",
//                   }),
//                 ]
//               ),
//               guard(
//                 Array.isArray(required)
//                   ? required.includes(name)
//                   : required === true,
//                 () => [
//                   create("strong", {
//                     style: {
//                       fontSize: "var(--ifm-code-font-size)",
//                       color: "var(--openapi-required)",
//                     },
//                     children: " required",
//                   }),
//                 ]
//               ),
//             ],
//           }),
//           create("div", {
//             style: { marginLeft: "1rem" },
//             children: [
//               guard(getQualifierMessage(schema), (message) =>
//                 create("div", {
//                   style: { marginTop: ".5rem", marginBottom: ".5rem" },
//                   children: createDescription(message),
//                 })
//               ),
//               guard(schema.description, (description) =>
//                 create("div", {
//                   style: { marginTop: ".5rem", marginBottom: ".5rem" },
//                   children: createDescription(description),
//                 })
//               ),
//             ],
//           }),
//           createAnyOneOf(schema),
//         ],
//       }),
//     ],
//   });
// }
/**
 * For handling discriminators that map to a same-level property (like 'petType').
 * Note: These should only be encountered while iterating through properties.
 */
function createPropertyDiscriminator(name, schemaName, schema, discriminator, required) {
    if (schema === undefined) {
        return undefined;
    }
    // render as a simple property if there's no mapping
    if (discriminator.mapping === undefined) {
        return createEdges({ name, schema, required });
    }
    return (0, utils_1.create)("div", {
        className: "openapi-discriminator__item openapi-schema__list-item",
        children: (0, utils_1.create)("div", {
            children: [
                (0, utils_1.create)("span", {
                    className: "openapi-schema__container",
                    children: [
                        (0, utils_1.create)("strong", {
                            className: "openapi-discriminator__name openapi-schema__property",
                            children: name,
                        }),
                        (0, utils_1.guard)(schemaName, (name) => (0, utils_1.create)("span", {
                            className: "openapi-schema__name",
                            children: ` ${schemaName}`,
                        })),
                        (0, utils_1.guard)(required, () => [
                            (0, utils_1.create)("span", {
                                className: "openapi-schema__required",
                                children: "required",
                            }),
                        ]),
                    ],
                }),
                (0, utils_1.guard)(schema.description, (description) => (0, utils_1.create)("div", {
                    style: {
                        paddingLeft: "1rem",
                    },
                    children: (0, createDescription_1.createDescription)(description),
                })),
                (0, utils_1.guard)((0, schema_1.getQualifierMessage)(discriminator), (message) => (0, utils_1.create)("div", {
                    style: {
                        paddingLeft: "1rem",
                    },
                    children: (0, createDescription_1.createDescription)(message),
                })),
                (0, utils_1.create)("DiscriminatorTabs", {
                    className: "openapi-tabs__discriminator",
                    children: Object.keys(discriminator === null || discriminator === void 0 ? void 0 : discriminator.mapping).map((key, index) => {
                        const label = key;
                        return (0, utils_1.create)("TabItem", {
                            // className: "openapi-tabs__discriminator-item",
                            label: label,
                            value: `${index}-item-discriminator`,
                            children: [createNodes(discriminator === null || discriminator === void 0 ? void 0 : discriminator.mapping[key], SCHEMA_TYPE)],
                        });
                    }),
                }),
            ],
        }),
    });
}
/**
 * Creates the edges or "leaves" of a schema tree. Edges can branch into sub-nodes with createDetails().
 */
function createEdges({ name, schema, required, discriminator, }) {
    var _a, _b, _c, _d, _e;
    if (SCHEMA_TYPE === "request") {
        if (schema.readOnly && schema.readOnly === true) {
            return undefined;
        }
    }
    if (SCHEMA_TYPE === "response") {
        if (schema.writeOnly && schema.writeOnly === true) {
            return undefined;
        }
    }
    const schemaName = (0, schema_1.getSchemaName)(schema);
    if (discriminator !== undefined && discriminator.propertyName === name) {
        return createPropertyDiscriminator(name, "string", schema, discriminator, required);
    }
    if (schema.oneOf !== undefined || schema.anyOf !== undefined) {
        return createDetailsNode(name, schemaName, schema, required, schema.nullable);
    }
    if (schema.properties !== undefined) {
        return createDetailsNode(name, schemaName, schema, required, schema.nullable);
    }
    if (schema.additionalProperties !== undefined) {
        return createDetailsNode(name, schemaName, schema, required, schema.nullable);
    }
    // array of objects
    if (((_a = schema.items) === null || _a === void 0 ? void 0 : _a.properties) !== undefined) {
        return createDetailsNode(name, schemaName, schema, required, schema.nullable);
    }
    if (((_b = schema.items) === null || _b === void 0 ? void 0 : _b.anyOf) !== undefined || ((_c = schema.items) === null || _c === void 0 ? void 0 : _c.oneOf) !== undefined) {
        return createDetailsNode(name, schemaName, schema, required, schema.nullable);
    }
    if (((_d = schema.items) === null || _d === void 0 ? void 0 : _d.allOf) !== undefined) {
        const mergedSchemas = mergeAllOf(schema.items);
        if (SCHEMA_TYPE === "request") {
            if (mergedSchemas.readOnly && mergedSchemas.readOnly === true) {
                return undefined;
            }
        }
        if (SCHEMA_TYPE === "response") {
            if (mergedSchemas.writeOnly && mergedSchemas.writeOnly === true) {
                return undefined;
            }
        }
        const mergedSchemaName = (0, schema_1.getSchemaName)(mergedSchemas);
        if (mergedSchemas.oneOf !== undefined ||
            mergedSchemas.anyOf !== undefined) {
            return createDetailsNode(name, mergedSchemaName, mergedSchemas, required, mergedSchemas.nullable);
        }
        if (mergedSchemas.properties !== undefined) {
            return createDetailsNode(name, mergedSchemaName, mergedSchemas, required, mergedSchemas.nullable);
        }
        if (mergedSchemas.additionalProperties !== undefined) {
            return createDetailsNode(name, mergedSchemaName, mergedSchemas, required, mergedSchemas.nullable);
        }
        // array of objects
        if (((_e = mergedSchemas.items) === null || _e === void 0 ? void 0 : _e.properties) !== undefined) {
            return createDetailsNode(name, mergedSchemaName, mergedSchemas, required, mergedSchemas.nullable);
        }
        return (0, utils_1.create)("SchemaItem", {
            collapsible: false,
            name,
            required: Array.isArray(required) ? required.includes(name) : required,
            schemaName: mergedSchemaName,
            qualifierMessage: (0, schema_1.getQualifierMessage)(mergedSchemas),
            schema: mergedSchemas,
        });
    }
    // primitives and array of non-objects
    return (0, utils_1.create)("SchemaItem", {
        collapsible: false,
        name,
        required: Array.isArray(required) ? required.includes(name) : required,
        schemaName: schemaName,
        qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
        schema: schema,
    });
}
/**
 * Creates a hierarchical level of a schema tree. Nodes produce edges that can branch into sub-nodes with edges, recursively.
 */
function createNodes(schema, schemaType) {
    SCHEMA_TYPE = schemaType;
    if (SCHEMA_TYPE === "request") {
        if (schema.readOnly && schema.readOnly === true) {
            return undefined;
        }
    }
    if (SCHEMA_TYPE === "response") {
        if (schema.writeOnly && schema.writeOnly === true) {
            return undefined;
        }
    }
    const nodes = [];
    // if (schema.discriminator !== undefined) {
    //   return createDiscriminator(schema);
    // }
    if (schema.oneOf !== undefined || schema.anyOf !== undefined) {
        nodes.push(createAnyOneOf(schema));
    }
    if (schema.properties !== undefined) {
        nodes.push(createProperties(schema));
    }
    if (schema.additionalProperties !== undefined) {
        nodes.push(createAdditionalProperties(schema));
    }
    // TODO: figure out how to handle array of objects
    if (schema.items !== undefined) {
        nodes.push(createItems(schema));
    }
    if (schema.allOf !== undefined) {
        const mergedSchemas = mergeAllOf(schema);
        if (mergedSchemas.oneOf !== undefined ||
            mergedSchemas.anyOf !== undefined) {
            nodes.push(createAnyOneOf(mergedSchemas));
        }
        if (mergedSchemas.properties !== undefined) {
            nodes.push(createProperties(mergedSchemas));
        }
    }
    if (nodes.length && nodes.length > 0) {
        return nodes.filter(Boolean).flat();
    }
    // primitive
    if (schema.type !== undefined) {
        if (schema.allOf) {
            //handle circular result in allOf
            if (schema.allOf.length && typeof schema.allOf[0] === "string") {
                return (0, utils_1.create)("div", {
                    style: {
                        marginTop: ".5rem",
                        marginBottom: ".5rem",
                        marginLeft: "1rem",
                    },
                    children: (0, createDescription_1.createDescription)(schema.allOf[0]),
                });
            }
        }
        return (0, utils_1.create)("div", {
            style: {
                marginTop: ".5rem",
                marginBottom: ".5rem",
            },
            children: [
                (0, createDescription_1.createDescription)(schema.type),
                (0, utils_1.guard)((0, schema_1.getQualifierMessage)(schema), (message) => (0, utils_1.create)("div", {
                    style: {
                        paddingTop: "1rem",
                    },
                    children: (0, createDescription_1.createDescription)(message),
                })),
            ],
        });
    }
    // handle circular references
    if (typeof schema === "string") {
        return (0, utils_1.create)("div", {
            style: {
                marginTop: ".5rem",
                marginBottom: ".5rem",
            },
            children: [
                (0, createDescription_1.createDescription)(schema),
                (0, utils_1.guard)((0, schema_1.getQualifierMessage)(schema), (message) => (0, utils_1.create)("div", {
                    style: {
                        paddingTop: "1rem",
                    },
                    children: (0, createDescription_1.createDescription)(message),
                })),
            ],
        });
    }
    // Unknown node/schema type should return undefined
    // So far, haven't seen this hit in testing
    return "any";
}
