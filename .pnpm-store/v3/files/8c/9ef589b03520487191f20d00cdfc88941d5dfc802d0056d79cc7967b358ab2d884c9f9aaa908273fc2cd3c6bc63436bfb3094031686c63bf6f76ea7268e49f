"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = plugin;
// Transform <details> to <Details>
// MDX 2 doesn't allow to substitute html elements with the provider anymore
function plugin() {
    return async (root) => {
        const { visit } = await import('unist-util-visit');
        visit(root, 'mdxJsxFlowElement', (node) => {
            if (node.name === 'details') {
                node.name = 'Details';
            }
        });
    };
}
//# sourceMappingURL=index.js.map