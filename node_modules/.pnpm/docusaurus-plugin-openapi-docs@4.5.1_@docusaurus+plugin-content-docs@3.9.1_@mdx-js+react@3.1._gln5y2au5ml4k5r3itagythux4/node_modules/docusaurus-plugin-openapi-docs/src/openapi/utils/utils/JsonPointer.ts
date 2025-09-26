/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import JsonPointerLib from "json-pointer";

const origParse = JsonPointerLib.parse;
/**
 * Wrapper for JsonPointer. Provides common operations
 */

export class JsonPointer {
  /**
   * returns last JsonPointer token
   * if level > 1 returns levels last (second last/third last)
   * @example
   * // returns subpath
   * JsonPointerHelper.baseName('/path/0/subpath')
   * // returns foo
   * JsonPointerHelper.baseName('/path/foo/subpath', 2)
   */
  static baseName(pointer: any, level = 1) {
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
  static dirName(pointer: any, level = 1) {
    const tokens = JsonPointer.parse(pointer);
    return JsonPointerLib.compile(tokens.slice(0, tokens.length - level));
  }

  /**
   * returns relative path tokens
   * @example
   * // returns ['subpath']
   * JsonPointerHelper.relative('/path/0', '/path/0/subpath')
   * // returns ['foo', 'subpath']
   * JsonPointerHelper.relative('/path', '/path/foo/subpath')
   */
  static relative(from: any, to: any): string[] {
    const fromTokens = JsonPointer.parse(from);
    const toTokens = JsonPointer.parse(to);
    return toTokens.slice(fromTokens.length);
  }

  /**
   * overridden JsonPointer original parse to take care of prefixing '#' symbol
   * that is not valid JsonPointer
   */
  static parse(pointer: any) {
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
  static join(base: any, tokens: any) {
    // TODO: optimize
    const baseTokens = JsonPointer.parse(base);
    const resTokens = baseTokens.concat(tokens);
    return JsonPointerLib.compile(resTokens);
  }

  static get(object: object, pointer: string) {
    return JsonPointerLib.get(object, pointer);
  }

  static compile(tokens: string[]) {
    return JsonPointerLib.compile(tokens);
  }

  static escape(pointer: string) {
    return JsonPointerLib.escape(pointer);
  }
}

JsonPointerLib.parse = JsonPointer.parse;
Object.assign(JsonPointer, JsonPointerLib);
export default JsonPointer;
