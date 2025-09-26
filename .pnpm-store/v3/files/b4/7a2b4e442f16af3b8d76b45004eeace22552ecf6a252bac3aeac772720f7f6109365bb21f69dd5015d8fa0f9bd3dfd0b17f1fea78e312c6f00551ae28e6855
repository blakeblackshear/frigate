"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prettier = __importStar(require("prettier"));
const createSchema_1 = require("./createSchema");
describe("createNodes", () => {
    describe("oneOf", () => {
        it("should create readable MODs for oneOf primitive properties", async () => {
            const schema = {
                "x-tags": ["clown"],
                type: "object",
                properties: {
                    oneOfProperty: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    noseLength: {
                                        type: "number",
                                    },
                                },
                                required: ["noseLength"],
                                description: "Clown's nose length",
                            },
                            {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                                description: "Array of strings",
                            },
                            {
                                type: "boolean",
                            },
                            {
                                type: "number",
                            },
                            {
                                type: "string",
                            },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "request").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle oneOf with different primitive types", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        oneOf: [
                            { type: "string" },
                            { type: "number" },
                            { type: "boolean" },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle oneOf with complex types", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    objectProp: { type: "string" },
                                },
                            },
                            {
                                type: "array",
                                items: { type: "number" },
                            },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle nested oneOf clauses", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    nestedOneOfProp: {
                                        oneOf: [{ type: "string" }, { type: "number" }],
                                    },
                                },
                            },
                            { type: "boolean" },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        // TypeError: Cannot read properties of undefined (reading 'length')
        // eslint-disable-next-line jest/no-commented-out-tests
        // it("should handle oneOf with discriminator", async () => {
        //   const schema: SchemaObject = {
        //     type: "object",
        //     discriminator: { propertyName: "type" },
        //     properties: {
        //       type: { type: "string" },
        //     },
        //     oneOf: [
        //       {
        //         type: "object",
        //         properties: {
        //           type: { type: "string", enum: ["typeA"] },
        //           propA: { type: "string" },
        //         },
        //         required: ["type"],
        //       },
        //       {
        //         type: "object",
        //         properties: {
        //           type: { type: "string", enum: ["typeB"] },
        //           propB: { type: "number" },
        //         },
        //         required: ["type"],
        //       },
        //     ],
        //   };
        //   expect(
        //     await Promise.all(
        //       createNodes(schema, "response").map(
        //         async (md: any) => await prettier.format(md, { parser: "babel" })
        //       )
        //     )
        //   ).toMatchSnapshot();
        // });
        it("should handle oneOf with shared properties", async () => {
            const schema = {
                type: "object",
                properties: {
                    sharedProp: { type: "string" },
                    oneOfProperty: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    specificPropA: { type: "string" },
                                },
                            },
                            {
                                type: "object",
                                properties: {
                                    specificPropB: { type: "number" },
                                },
                            },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle oneOf with required properties", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    requiredPropA: { type: "string" },
                                },
                                required: ["requiredPropA"],
                            },
                            {
                                type: "object",
                                properties: {
                                    requiredPropB: { type: "number" },
                                },
                                required: ["requiredPropB"],
                            },
                        ],
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
    });
    describe("anyOf", () => {
        it("should render primitives within anyOf", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        anyOf: [
                            {
                                type: "integer",
                            },
                            {
                                type: "boolean",
                            },
                        ],
                        title: "One of int or bool",
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should render oneOf within anyOf", async () => {
            const schema = {
                type: "object",
                properties: {
                    oneOfProperty: {
                        anyOf: [
                            {
                                oneOf: [
                                    {
                                        type: "integer",
                                    },
                                    {
                                        type: "boolean",
                                    },
                                ],
                                title: "An int or a bool",
                            },
                            {
                                type: "string",
                            },
                        ],
                        title: "One of int or bool, or a string",
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
    });
    describe("allOf", () => {
        it("should render same-level properties with allOf", async () => {
            const schema = {
                allOf: [
                    {
                        type: "object",
                        properties: {
                            allOfProp1: {
                                type: "string",
                            },
                            allOfProp2: {
                                type: "string",
                            },
                        },
                    },
                ],
                properties: {
                    parentProp1: {
                        type: "string",
                    },
                    parentProp2: {
                        type: "string",
                    },
                },
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should correctly merge nested properties from multiple allOf schemas", async () => {
            const schema = {
                allOf: [
                    {
                        type: "object",
                        properties: {
                            outerProp1: {
                                type: "object",
                                properties: {
                                    innerProp1: {
                                        type: "string",
                                    },
                                },
                            },
                        },
                    },
                    {
                        type: "object",
                        properties: {
                            outerProp2: {
                                type: "object",
                                properties: {
                                    innerProp2: {
                                        type: "number",
                                    },
                                },
                            },
                        },
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should correctly handle shared required properties across allOf schemas", async () => {
            const schema = {
                allOf: [
                    {
                        type: "object",
                        properties: {
                            sharedProp: {
                                type: "string",
                            },
                        },
                        required: ["sharedProp"],
                    },
                    {
                        type: "object",
                        properties: {
                            anotherProp: {
                                type: "number",
                            },
                        },
                        required: ["anotherProp"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        // Could not resolve values for path:"properties.conflictingProp.type". They are probably incompatible. Values:
        // "string"
        // "number"
        // eslint-disable-next-line jest/no-commented-out-tests
        // it("should handle conflicting properties in allOf schemas", async () => {
        //   const schema: SchemaObject = {
        //     allOf: [
        //       {
        //         type: "object",
        //         properties: {
        //           conflictingProp: {
        //             type: "string",
        //           },
        //         },
        //       },
        //       {
        //         type: "object",
        //         properties: {
        //           conflictingProp: {
        //             type: "number",
        //           },
        //         },
        //       },
        //     ],
        //   };
        //   expect(
        //     await Promise.all(
        //       createNodes(schema, "response").map(
        //         async (md: any) => await prettier.format(md, { parser: "babel" })
        //       )
        //     )
        //   ).toMatchSnapshot();
        // });
        // Could not resolve values for path:"type". They are probably incompatible. Values:
        // "object"
        // "array"
        // eslint-disable-next-line jest/no-commented-out-tests
        // it("should handle mixed data types in allOf schemas", async () => {
        //   const schema: SchemaObject = {
        //     allOf: [
        //       {
        //         type: "object",
        //         properties: {
        //           mixedTypeProp1: {
        //             type: "string",
        //           },
        //         },
        //       },
        //       {
        //         type: "array",
        //         items: {
        //           type: "number",
        //         },
        //       },
        //     ],
        //   };
        //   expect(
        //     await Promise.all(
        //       createNodes(schema, "response").map(
        //         async (md: any) => await prettier.format(md, { parser: "babel" })
        //       )
        //     )
        //   ).toMatchSnapshot();
        // });
        it("should correctly deep merge properties in allOf schemas", async () => {
            const schema = {
                allOf: [
                    {
                        type: "object",
                        properties: {
                            deepProp: {
                                type: "object",
                                properties: {
                                    innerProp1: {
                                        type: "string",
                                    },
                                },
                            },
                        },
                    },
                    {
                        type: "object",
                        properties: {
                            deepProp: {
                                type: "object",
                                properties: {
                                    innerProp2: {
                                        type: "number",
                                    },
                                },
                            },
                        },
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        // eslint-disable-next-line jest/no-commented-out-tests
        // it("should handle discriminator with allOf schemas", async () => {
        //   const schema: SchemaObject = {
        //     allOf: [
        //       {
        //         type: "object",
        //         discriminator: {
        //           propertyName: "type",
        //         },
        //         properties: {
        //           type: {
        //             type: "string",
        //           },
        //         },
        //       },
        //       {
        //         type: "object",
        //         properties: {
        //           specificProp: {
        //             type: "string",
        //           },
        //         },
        //       },
        //     ],
        //   };
        //   expect(
        //     await Promise.all(
        //       createNodes(schema, "response").map(
        //         async (md: any) => await prettier.format(md, { parser: "babel" })
        //       )
        //     )
        //   ).toMatchSnapshot();
        // });
    });
    describe("discriminator", () => {
        it("should handle basic discriminator with oneOf", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with shared properties", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                    sharedProp: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with nested schemas", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            nestedA: {
                                type: "object",
                                properties: {
                                    propA1: { type: "string" },
                                    propA2: { type: "number" },
                                },
                            },
                        },
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            nestedB: {
                                type: "object",
                                properties: {
                                    propB1: { type: "string" },
                                    propB2: { type: "boolean" },
                                },
                            },
                        },
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with additional properties", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        additionalProperties: false,
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        additionalProperties: true,
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with allOf", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                },
                allOf: [
                    {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["typeA"] },
                                    propA: { type: "string" },
                                },
                                required: ["type"],
                            },
                            {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["typeB"] },
                                    propB: { type: "number" },
                                },
                                required: ["type"],
                            },
                        ],
                    },
                    {
                        type: "object",
                        properties: {
                            sharedProp: { type: "string" },
                        },
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with required properties", async () => {
            const schema = {
                type: "object",
                discriminator: { propertyName: "type" },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type", "propA"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type", "propB"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle basic discriminator with mapping", async () => {
            const schema = {
                type: "object",
                discriminator: {
                    propertyName: "type",
                    mapping: {
                        typeA: "#/definitions/TypeA",
                        typeB: "#/definitions/TypeB",
                    },
                },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with shared properties and mapping", async () => {
            const schema = {
                type: "object",
                discriminator: {
                    propertyName: "type",
                    mapping: {
                        typeA: "#/definitions/TypeA",
                        typeB: "#/definitions/TypeB",
                    },
                },
                properties: {
                    type: { type: "string" },
                    sharedProp: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with allOf and mapping", async () => {
            const schema = {
                type: "object",
                discriminator: {
                    propertyName: "type",
                    mapping: {
                        typeA: "#/definitions/TypeA",
                        typeB: "#/definitions/TypeB",
                    },
                },
                properties: {
                    type: { type: "string" },
                },
                allOf: [
                    {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["typeA"] },
                                    propA: { type: "string" },
                                },
                                required: ["type"],
                            },
                            {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["typeB"] },
                                    propB: { type: "number" },
                                },
                                required: ["type"],
                            },
                        ],
                    },
                    {
                        type: "object",
                        properties: {
                            sharedProp: { type: "string" },
                        },
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
        it("should handle discriminator with required properties and mapping", async () => {
            const schema = {
                type: "object",
                discriminator: {
                    propertyName: "type",
                    mapping: {
                        typeA: "#/definitions/TypeA",
                        typeB: "#/definitions/TypeB",
                    },
                },
                properties: {
                    type: { type: "string" },
                },
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeA"] },
                            propA: { type: "string" },
                        },
                        required: ["type", "propA"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["typeB"] },
                            propB: { type: "number" },
                        },
                        required: ["type", "propB"],
                    },
                ],
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "response").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
    });
    describe("additionalProperties", () => {
        it.each([
            [
                {
                    allOf: [
                        {
                            oneOf: [
                                {
                                    type: "object",
                                    properties: {
                                        type: {
                                            type: "string",
                                            enum: ["nose"],
                                        },
                                    },
                                    required: ["type"],
                                },
                                {
                                    type: "object",
                                    properties: {
                                        type: {
                                            type: "string",
                                            enum: ["mouth"],
                                        },
                                    },
                                    required: ["type"],
                                },
                                {
                                    type: "object",
                                    properties: {
                                        type: {
                                            type: "string",
                                            enum: ["eyes"],
                                        },
                                        default: {
                                            type: "string",
                                        },
                                    },
                                    required: ["type"],
                                },
                            ],
                        },
                        {
                            type: "object",
                            properties: {
                                description: {
                                    type: "string",
                                    description: "Description of the body part.",
                                },
                            },
                            required: ["description"],
                        },
                    ],
                },
            ],
            [
                {
                    type: "array",
                    items: { type: "object", properties: { a: "string", b: "number" } },
                },
            ],
            [{ type: "string" }],
            [{ type: "number" }],
            [{ type: "integer" }],
            [{ type: "boolean" }],
            [false],
            [true],
            [{}],
        ])("should handle additionalProperties: %p", async (additionalProperties) => {
            const schema = {
                type: "object",
                additionalProperties,
            };
            expect(await Promise.all((0, createSchema_1.createNodes)(schema, "request").map(async (md) => await prettier.format(md, { parser: "babel" })))).toMatchSnapshot();
        });
    });
});
