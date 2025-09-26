"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = plugin;
const utils_1 = require("@docusaurus/utils");
/**
 * In the blog list view, each post will be compiled separately. However, they
 * may use the same footnote IDs. This leads to duplicated DOM IDs and inability
 * to navigate to footnote references. This plugin fixes it by appending a
 * unique hash to each reference/definition.
 */
function plugin() {
    return async (root, vfile) => {
        const { visit } = await import('unist-util-visit');
        const suffix = `-${(0, utils_1.simpleHash)(vfile.path, 6)}`;
        visit(root, 'footnoteReference', (node) => {
            node.identifier += suffix;
        });
        visit(root, 'footnoteDefinition', (node) => {
            node.identifier += suffix;
        });
    };
}
