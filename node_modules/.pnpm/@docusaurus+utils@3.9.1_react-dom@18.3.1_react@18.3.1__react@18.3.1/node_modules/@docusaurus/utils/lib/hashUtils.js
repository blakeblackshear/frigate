"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.md5Hash = md5Hash;
exports.simpleHash = simpleHash;
exports.docuHash = docuHash;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const pathUtils_1 = require("./pathUtils");
/** Thin wrapper around `crypto.createHash("md5")`. */
function md5Hash(str) {
    return (0, crypto_1.createHash)('md5').update(str).digest('hex');
}
/** Creates an MD5 hash and truncates it to the given length. */
function simpleHash(str, length) {
    return md5Hash(str).substring(0, length);
}
// Based on https://github.com/gatsbyjs/gatsby/pull/21518/files
/**
 * Given an input string, convert to kebab-case and append a hash, avoiding name
 * collision. Also removes part of the string if its larger than the allowed
 * filename per OS, avoiding `ERRNAMETOOLONG` error.
 */
function docuHash(strInput, options) {
    // TODO check this historical behavior
    //  I'm not sure it makes sense to keep it...
    if (strInput === '/' && typeof options?.hashExtra === 'undefined') {
        return 'index';
    }
    const str = strInput === '/' ? 'index' : strInput;
    const hashExtra = options?.hashExtra ?? '';
    const hashLength = options?.hashLength ?? 3;
    const stringToHash = str + hashExtra;
    const shortHash = simpleHash(stringToHash, hashLength);
    const parsedPath = `${lodash_1.default.kebabCase(str)}-${shortHash}`;
    if ((0, pathUtils_1.isNameTooLong)(parsedPath)) {
        return `${(0, pathUtils_1.shortName)(lodash_1.default.kebabCase(str))}-${shortHash}`;
    }
    return parsedPath;
}
//# sourceMappingURL=hashUtils.js.map