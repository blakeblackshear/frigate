"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPrefix = addPrefix;
exports.removeSuffix = removeSuffix;
exports.addSuffix = addSuffix;
exports.removePrefix = removePrefix;
/** Adds a given string prefix to `str`. */
function addPrefix(str, prefix) {
    return str.startsWith(prefix) ? str : `${prefix}${str}`;
}
/** Removes a given string suffix from `str`. */
function removeSuffix(str, suffix) {
    if (suffix === '') {
        // str.slice(0, 0) is ""
        return str;
    }
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}
/** Adds a given string suffix to `str`. */
function addSuffix(str, suffix) {
    return str.endsWith(suffix) ? str : `${str}${suffix}`;
}
/** Removes a given string prefix from `str`. */
function removePrefix(str, prefix) {
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}
//# sourceMappingURL=stringUtils.js.map