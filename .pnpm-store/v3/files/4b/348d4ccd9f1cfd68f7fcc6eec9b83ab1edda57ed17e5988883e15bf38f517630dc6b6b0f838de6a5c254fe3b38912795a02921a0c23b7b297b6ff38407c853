"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = markdownLoader;
const blogUtils_1 = require("./blogUtils");
function markdownLoader(source) {
    const fileString = source;
    const callback = this.async();
    const markdownLoaderOptions = this.getOptions();
    // Linkify blog posts
    let finalContent = fileString;
    // Truncate content if requested (e.g: file.md?truncated=true).
    const truncated = this.resourceQuery
        ? !!new URLSearchParams(this.resourceQuery.slice(1)).get('truncated')
        : undefined;
    // TODO truncate with the AST instead of the string ?
    if (truncated) {
        finalContent = (0, blogUtils_1.truncate)(finalContent, markdownLoaderOptions.truncateMarker);
    }
    return callback(null, finalContent);
}
