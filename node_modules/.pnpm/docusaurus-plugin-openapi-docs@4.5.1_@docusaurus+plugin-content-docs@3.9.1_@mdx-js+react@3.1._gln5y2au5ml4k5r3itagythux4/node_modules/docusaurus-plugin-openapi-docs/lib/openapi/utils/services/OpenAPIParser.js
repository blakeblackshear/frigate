"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIParser = void 0;
// @ts-nocheck
const RedocNormalizedOptions_1 = require("./RedocNormalizedOptions");
const helpers_1 = require("../utils/helpers");
const JsonPointer_1 = require("../utils/JsonPointer");
const openapi_1 = require("../utils/openapi");
/**
 * Helper class to keep track of visited references to avoid
 * endless recursion because of circular refs
 */
class RefCounter {
    constructor() {
        this._counter = {};
    }
    reset() {
        this._counter = {};
    }
    visit(ref) {
        this._counter[ref] = this._counter[ref] ? this._counter[ref] + 1 : 1;
    }
    exit(ref) {
        this._counter[ref] = this._counter[ref] && this._counter[ref] - 1;
    }
    visited(ref) {
        return !!this._counter[ref];
    }
}
/**
 * Loads and keeps spec. Provides raw spec operations
 */
class OpenAPIParser {
    constructor(spec, specUrl, options = new RedocNormalizedOptions_1.RedocNormalizedOptions()) {
        this.options = options;
        this._refCounter = new RefCounter();
        this.allowMergeRefs = false;
        /**
         * get spec part by JsonPointer ($ref)
         */
        this.byRef = (ref) => {
            let res;
            if (!this.spec) {
                return;
            }
            if (ref.charAt(0) !== "#") {
                ref = "#" + ref;
            }
            ref = decodeURIComponent(ref);
            try {
                res = JsonPointer_1.JsonPointer.get(this.spec, ref);
            }
            catch (e) {
                // do nothing
            }
            return res || {};
        };
        this.validate(spec);
        this.spec = spec;
        this.allowMergeRefs = spec.openapi.startsWith("3.1");
        const href = undefined;
        if (typeof specUrl === "string") {
            this.specUrl = new URL(specUrl, href).href;
        }
    }
    validate(spec) {
        if (spec.openapi === undefined) {
            throw new Error("Document must be valid OpenAPI 3.0.0 definition");
        }
    }
    /**
     * checks if the object is OpenAPI reference (contains $ref property)
     */
    isRef(obj) {
        if (!obj) {
            return false;
        }
        return obj.$ref !== undefined && obj.$ref !== null;
    }
    /**
     * resets visited endpoints. should be run after
     */
    resetVisited() {
        if (process.env.NODE_ENV !== "production") {
            // check in dev mode
            for (const k in this._refCounter._counter) {
                if (this._refCounter._counter[k] > 0) {
                    console.warn("Not exited reference: " + k);
                }
            }
        }
        this._refCounter = new RefCounter();
    }
    exitRef(ref) {
        if (!this.isRef(ref)) {
            return;
        }
        this._refCounter.exit(ref.$ref);
    }
    /**
     * Resolve given reference object or return as is if it is not a reference
     * @param obj object to dereference
     * @param forceCircular whether to dereference even if it is circular ref
     */
    deref(obj, forceCircular = false, mergeAsAllOf = false) {
        if (this.isRef(obj)) {
            const schemaName = (0, openapi_1.getDefinitionName)(obj.$ref);
            if (schemaName && this.options.ignoreNamedSchemas.has(schemaName)) {
                return { type: "object", title: schemaName };
            }
            const resolved = this.byRef(obj.$ref);
            const visited = this._refCounter.visited(obj.$ref);
            this._refCounter.visit(obj.$ref);
            if (visited && !forceCircular) {
                // circular reference detected
                // tslint:disable-next-line
                return Object.assign({}, resolved, { "x-circular-ref": true });
            }
            // deref again in case one more $ref is here
            let result = resolved;
            if (this.isRef(resolved)) {
                result = this.deref(resolved, false, mergeAsAllOf);
                this.exitRef(resolved);
            }
            return this.allowMergeRefs
                ? this.mergeRefs(obj, resolved, mergeAsAllOf)
                : result;
        }
        return obj;
    }
    shallowDeref(obj) {
        if (this.isRef(obj)) {
            const schemaName = (0, openapi_1.getDefinitionName)(obj.$ref);
            if (schemaName && this.options.ignoreNamedSchemas.has(schemaName)) {
                return { type: "object", title: schemaName };
            }
            const resolved = this.byRef(obj.$ref);
            return this.allowMergeRefs
                ? this.mergeRefs(obj, resolved, false)
                : resolved;
        }
        return obj;
    }
    mergeRefs(ref, resolved, mergeAsAllOf) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { $ref, ...rest } = ref;
        const keys = Object.keys(rest);
        if (keys.length === 0) {
            if (this.isRef(resolved)) {
                return this.shallowDeref(resolved);
            }
            return resolved;
        }
        if (mergeAsAllOf &&
            keys.some((k) => k !== "description" && k !== "title" && k !== "externalDocs")) {
            return {
                allOf: [rest, resolved],
            };
        }
        else {
            // small optimization
            return {
                ...resolved,
                ...rest,
            };
        }
    }
    /**
     * Merge allOf constraints.
     * @param schema schema with allOF
     * @param $ref pointer of the schema
     * @param forceCircular whether to dereference children even if it is a circular ref
     */
    mergeAllOf(schema, $ref, forceCircular = false, used$Refs = new Set()) {
        if ($ref) {
            used$Refs.add($ref);
        }
        schema = this.hoistOneOfs(schema);
        if (schema.allOf === undefined) {
            return schema;
        }
        let receiver = {
            ...schema,
            allOf: undefined,
            parentRefs: [],
            title: schema.title || (0, openapi_1.getDefinitionName)($ref),
        };
        // avoid mutating inner objects
        if (receiver.properties !== undefined &&
            typeof receiver.properties === "object") {
            receiver.properties = { ...receiver.properties };
        }
        if (receiver.items !== undefined && typeof receiver.items === "object") {
            receiver.items = { ...receiver.items };
        }
        const allOfSchemas = schema.allOf
            .map((subSchema) => {
            if (subSchema && subSchema.$ref && used$Refs.has(subSchema.$ref)) {
                return undefined;
            }
            const resolved = this.deref(subSchema, forceCircular, true);
            const subRef = subSchema.$ref || undefined;
            const subMerged = this.mergeAllOf(resolved, subRef, forceCircular, used$Refs);
            receiver.parentRefs.push(...(subMerged.parentRefs || []));
            return {
                $ref: subRef,
                schema: subMerged,
            };
        })
            .filter((child) => child !== undefined);
        for (const { $ref: subSchemaRef, schema: subSchema } of allOfSchemas) {
            const { type, enum: enumProperty, "x-enumDescription": enumDescription, properties, items, required, oneOf, anyOf, title, ...otherConstraints } = subSchema;
            if (receiver.type !== type &&
                receiver.type !== undefined &&
                type !== undefined) {
                console.warn(`Incompatible types in allOf at "${$ref}": "${receiver.type}" and "${type}"`);
            }
            if (type !== undefined) {
                if (Array.isArray(type) && Array.isArray(receiver.type)) {
                    receiver.type = [...type, ...receiver.type];
                }
                else {
                    receiver.type = type;
                }
            }
            if (enumProperty !== undefined) {
                if (Array.isArray(enumProperty) && Array.isArray(receiver.enum)) {
                    receiver.enum = [...enumProperty, ...receiver.enum];
                }
                else {
                    receiver.enum = enumProperty;
                }
            }
            if (properties !== undefined) {
                receiver.properties = receiver.properties || {};
                for (const prop in properties) {
                    if (!receiver.properties[prop]) {
                        receiver.properties[prop] = properties[prop];
                    }
                    else {
                        // merge inner properties
                        const mergedProp = this.mergeAllOf({ allOf: [receiver.properties[prop], properties[prop]] }, $ref + "/properties/" + prop);
                        receiver.properties[prop] = mergedProp;
                        this.exitParents(mergedProp); // every prop resolution should have separate recursive stack
                    }
                }
            }
            if (items !== undefined) {
                const receiverItems = (0, helpers_1.isBoolean)(receiver.items)
                    ? { items: receiver.items }
                    : receiver.items
                        ? Object.assign({}, receiver.items)
                        : {};
                const subSchemaItems = (0, helpers_1.isBoolean)(items)
                    ? { items }
                    : Object.assign({}, items);
                // merge inner properties
                receiver.items = this.mergeAllOf({ allOf: [receiverItems, subSchemaItems] }, $ref + "/items");
            }
            if (required !== undefined) {
                receiver.required = (receiver.required || []).concat(required);
            }
            if (oneOf !== undefined) {
                receiver.oneOf = oneOf;
            }
            if (anyOf !== undefined) {
                receiver.anyOf = anyOf;
            }
            // merge rest of constraints
            // TODO: do more intelligent merge
            receiver = {
                ...receiver,
                title: receiver.title || title,
                ...otherConstraints,
            };
            if (subSchemaRef) {
                receiver.parentRefs.push(subSchemaRef);
                if (receiver.title === undefined && (0, openapi_1.isNamedDefinition)(subSchemaRef)) {
                    // this is not so correct behaviour. commented out for now
                    // ref: https://github.com/Redocly/redoc/issues/601
                    // receiver.title = JsonPointer.baseName(subSchemaRef);
                }
            }
        }
        return receiver;
    }
    /**
     * Find all derived definitions among #/components/schemas from any of $refs
     * returns map of definition pointer to definition name
     * @param $refs array of references to find derived from
     */
    findDerived($refs) {
        const res = {};
        const schemas = (this.spec.components && this.spec.components.schemas) || {};
        for (const defName in schemas) {
            const def = this.deref(schemas[defName]);
            if (def.allOf !== undefined &&
                def.allOf.find((obj) => obj.$ref !== undefined && $refs.indexOf(obj.$ref) > -1)) {
                res["#/components/schemas/" + defName] = [
                    def["x-discriminator-value"] || defName,
                ];
            }
        }
        return res;
    }
    exitParents(shema) {
        for (const parent$ref of shema.parentRefs || []) {
            this.exitRef({ $ref: parent$ref });
        }
    }
    hoistOneOfs(schema) {
        if (schema.allOf === undefined) {
            return schema;
        }
        const allOf = schema.allOf;
        for (let i = 0; i < allOf.length; i++) {
            const sub = allOf[i];
            if ((0, helpers_1.isArray)(sub.oneOf)) {
                const beforeAllOf = allOf.slice(0, i);
                const afterAllOf = allOf.slice(i + 1);
                return {
                    oneOf: sub.oneOf.map((part) => {
                        const merged = this.mergeAllOf({
                            allOf: [...beforeAllOf, part, ...afterAllOf],
                        });
                        // each oneOf should be independent so exiting all the parent refs
                        // otherwise it will cause false-positive recursive detection
                        this.exitParents(merged);
                        return merged;
                    }),
                };
            }
        }
        return schema;
    }
}
exports.OpenAPIParser = OpenAPIParser;
