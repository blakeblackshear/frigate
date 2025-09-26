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
exports.JsonPointer = void 0;
const json_pointer_1 = __importDefault(require("json-pointer"));
const origParse = json_pointer_1.default.parse;
/**
 * Wrapper for JsonPointer. Provides common operations
 */
class JsonPointer {
    /**
     * returns last JsonPointer token
     * if level > 1 returns levels last (second last/third last)
     * @example
     * // returns subpath
     * JsonPointerHelper.baseName('/path/0/subpath')
     * // returns foo
     * JsonPointerHelper.baseName('/path/foo/subpath', 2)
     */
    static baseName(pointer, level = 1) {
        const tokens = JsonPointer.parse(pointer);
        return tokens[tokens.length - level];
    }
    /**
     * returns dirname of pointer
     * if level > 1 returns corresponding dirname in the hierarchy
     * @example
     * // returns /path/0
     * JsonPointerHelper.dirName('/path/0/subpath')
     * // returns /path
     * JsonPointerHelper.dirName('/path/foo/subpath', 2)
     */
    static dirName(pointer, level = 1) {
        const tokens = JsonPointer.parse(pointer);
        return json_pointer_1.default.compile(tokens.slice(0, tokens.length - level));
    }
    /**
     * returns relative path tokens
     * @example
     * // returns ['subpath']
     * JsonPointerHelper.relative('/path/0', '/path/0/subpath')
     * // returns ['foo', 'subpath']
     * JsonPointerHelper.relative('/path', '/path/foo/subpath')
     */
    static relative(from, to) {
        const fromTokens = JsonPointer.parse(from);
        const toTokens = JsonPointer.parse(to);
        return toTokens.slice(fromTokens.length);
    }
    /**
     * overridden JsonPointer original parse to take care of prefixing '#' symbol
     * that is not valid JsonPointer
     */
    static parse(pointer) {
        let ptr = pointer;
        if (ptr.charAt(0) === "#") {
            ptr = ptr.substring(1);
        }
        return origParse(ptr);
    }
    /**
     * Creates a JSON pointer path, by joining one or more tokens to a base path.
     *
     * @param {string} base - The base path
     * @param {string|string[]} tokens - The token(s) to append (e.g. ["name", "first"])
     * @returns {string}
     */
    static join(base, tokens) {
        // TODO: optimize
        const baseTokens = JsonPointer.parse(base);
        const resTokens = baseTokens.concat(tokens);
        return json_pointer_1.default.compile(resTokens);
    }
    static get(object, pointer) {
        return json_pointer_1.default.get(object, pointer);
    }
    static compile(tokens) {
        return json_pointer_1.default.compile(tokens);
    }
    static escape(pointer) {
        return json_pointer_1.default.escape(pointer);
    }
}
exports.JsonPointer = JsonPointer;
json_pointer_1.default.parse = JsonPointer.parse;
Object.assign(JsonPointer, json_pointer_1.default);
exports.default = JsonPointer;
