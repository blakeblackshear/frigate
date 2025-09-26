"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTrailingSlash = addTrailingSlash;
exports.default = applyTrailingSlash;
exports.addLeadingSlash = addLeadingSlash;
exports.removeTrailingSlash = removeTrailingSlash;
const stringUtils_1 = require("./stringUtils");
function addTrailingSlash(str) {
    return str.endsWith('/') ? str : `${str}/`;
}
// Trailing slash handling depends in some site configuration options
function applyTrailingSlash(path, options) {
    const { trailingSlash, baseUrl } = options;
    if (path.startsWith('#')) {
        // Never apply trailing slash to an anchor link
        return path;
    }
    function handleTrailingSlash(str, trailing) {
        return trailing ? addTrailingSlash(str) : removeTrailingSlash(str);
    }
    // undefined = legacy retrocompatible behavior
    if (typeof trailingSlash === 'undefined') {
        return path;
    }
    // The trailing slash should be handled before the ?search#hash !
    const [pathname] = path.split(/[#?]/);
    // Never transform '/' to ''
    // Never remove the baseUrl trailing slash!
    // If baseUrl = /myBase/, we want to emit /myBase/index.html and not
    // /myBase.html! See https://github.com/facebook/docusaurus/issues/5077
    const shouldNotApply = pathname === '/' || pathname === baseUrl;
    const newPathname = shouldNotApply
        ? pathname
        : handleTrailingSlash(pathname, trailingSlash);
    return path.replace(pathname, newPathname);
}
/** Appends a leading slash to `str`, if one doesn't exist. */
function addLeadingSlash(str) {
    return (0, stringUtils_1.addPrefix)(str, '/');
}
/** Removes the trailing slash from `str`. */
function removeTrailingSlash(str) {
    return (0, stringUtils_1.removeSuffix)(str, '/');
}
//# sourceMappingURL=applyTrailingSlash.js.map