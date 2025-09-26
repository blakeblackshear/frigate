"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormat = getFormat;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
// Copied from https://mdxjs.com/packages/mdx/#optionsmdextensions
// Although we are likely to only use .md / .mdx anyway...
const mdFormatExtensions = [
    '.md',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mkd',
    '.mdwn',
    '.mkdown',
    '.ron',
];
function getExtensionFormat(filepath) {
    const isMDFormat = mdFormatExtensions.includes(path_1.default.extname(filepath));
    // Bias toward mdx if unknown extension
    return isMDFormat ? 'md' : 'mdx';
}
function getFormat({ filePath, frontMatterFormat, markdownConfigFormat, }) {
    if (frontMatterFormat) {
        if (frontMatterFormat !== 'detect') {
            return frontMatterFormat;
        }
        return getExtensionFormat(filePath);
    }
    if (markdownConfigFormat !== 'detect') {
        return markdownConfigFormat;
    }
    return getExtensionFormat(filePath);
}
//# sourceMappingURL=format.js.map