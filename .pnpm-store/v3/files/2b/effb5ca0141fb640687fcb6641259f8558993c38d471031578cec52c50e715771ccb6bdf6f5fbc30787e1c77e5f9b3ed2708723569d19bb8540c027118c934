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
exports.convertSwagger2OpenAPI = convertSwagger2OpenAPI;
exports.loadAndResolveSpec = loadAndResolveSpec;
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
const openapi_core_1 = require("@redocly/openapi-core");
const chalk_1 = __importDefault(require("chalk"));
// @ts-ignore
const swagger2openapi_1 = require("swagger2openapi");
const OpenAPIParser_1 = require("./services/OpenAPIParser");
function serializer(replacer, cycleReplacer) {
    var stack = [], keys = [];
    if (cycleReplacer === undefined)
        cycleReplacer = function (key, value) {
            if (stack[0] === value)
                return "circular()";
            return value.title ? `circular(${value.title})` : "circular()";
        };
    return function (key, value) {
        // Resolve discriminator ref pointers
        if ((value === null || value === void 0 ? void 0 : value.discriminator) !== undefined) {
            const parser = new OpenAPIParser_1.OpenAPIParser(stack[0]);
            if (value.discriminator.mapping &&
                typeof value.discriminator.mapping === "object") {
                for (let [k, v] of Object.entries(value.discriminator.mapping)) {
                    const discriminator = k;
                    if (typeof v === "string" && v.charAt(0) === "#") {
                        const ref = v;
                        const resolvedRef = parser.byRef(ref);
                        value.discriminator.mapping[discriminator] = resolvedRef;
                    }
                }
            }
        }
        if (stack.length > 0) {
            // @ts-ignore
            var thisPos = stack.indexOf(this);
            // @ts-ignore
            ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
            ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
            // @ts-ignore
            if (~stack.indexOf(value))
                value = cycleReplacer.call(this, key, value);
        }
        else
            stack.push(value);
        // @ts-ignore
        return replacer === undefined ? value : replacer.call(this, key, value);
    };
}
function convertSwagger2OpenAPI(spec) {
    console.warn("[ReDoc Compatibility mode]: Converting OpenAPI 2.0 to OpenAPI 3.0");
    return new Promise((resolve, reject) => (0, swagger2openapi_1.convertObj)(spec, {
        patch: true,
        warnOnly: true,
        text: "{}",
        anchors: true,
        resolveInternal: true,
    }, (err, res) => {
        // TODO: log any warnings
        if (err) {
            return reject(err);
        }
        resolve(res && res.openapi);
    }));
}
async function resolveJsonRefs(specUrlOrObject) {
    try {
        let schema = await json_schema_ref_parser_1.default.dereference(specUrlOrObject, {
            continueOnError: true,
            resolve: {
                file: true,
                external: true,
                http: {
                    timeout: 15000, // 15 sec timeout
                },
            },
            dereference: {
                circular: true,
            },
        });
        return schema;
    }
    catch (err) {
        let errorMsg = "";
        if (err.errors[0] !== undefined) {
            const error = err.errors[0];
            errorMsg = `Error: [${error.message}] with footprint [${error.footprint}]`;
        }
        else {
            errorMsg = err;
        }
        console.error(chalk_1.default.yellow(errorMsg));
        return;
    }
}
async function loadAndResolveSpec(specUrlOrObject) {
    const config = new openapi_core_1.Config({});
    const bundleOpts = {
        config,
        base: process.cwd(),
    };
    if (typeof specUrlOrObject === "object" && specUrlOrObject !== null) {
        bundleOpts["doc"] = {
            source: { absoluteRef: "" },
            parsed: specUrlOrObject,
        };
    }
    else {
        bundleOpts["ref"] = specUrlOrObject;
    }
    // Force dereference ?
    // bundleOpts["dereference"] = true;
    const { bundle: { parsed }, } = await (0, openapi_core_1.bundle)(bundleOpts);
    //Pre-processing before resolving JSON refs
    if (parsed.components) {
        for (let [component, type] of Object.entries(parsed.components)) {
            if (component === "schemas") {
                for (let [schemaKey, schemaValue] of Object.entries(type)) {
                    const title = schemaValue["title"];
                    if (!title) {
                        schemaValue.title = schemaKey;
                    }
                }
            }
        }
    }
    const resolved = await resolveJsonRefs(parsed);
    // Force serialization and replace circular $ref pointers
    // @ts-ignore
    const serialized = JSON.stringify(resolved, serializer());
    let decycled;
    try {
        decycled = JSON.parse(serialized);
    }
    catch (err) {
        console.error(chalk_1.default.yellow(err));
    }
    return decycled !== undefined && typeof decycled === "object"
        ? decycled.swagger !== undefined
            ? convertSwagger2OpenAPI(decycled)
            : decycled
        : resolved;
}
