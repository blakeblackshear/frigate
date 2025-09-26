"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = plugin;
const utils_1 = require("../utils");
// TODO: this plugin shouldn't be in the core MDX loader
// After we allow plugins to provide Remark/Rehype plugins (see
// https://github.com/facebook/docusaurus/issues/6370), this should be provided
// by theme-mermaid itself
function plugin() {
    return async (root) => {
        const { visit } = await import('unist-util-visit');
        visit(root, 'code', (node) => {
            if (node.lang === 'mermaid') {
                // TODO migrate to mdxJsxFlowElement? cf admonitions
                (0, utils_1.transformNode)(node, {
                    type: 'mermaidCodeBlock',
                    data: {
                        hName: 'mermaid',
                        hProperties: {
                            value: node.value,
                        },
                    },
                });
            }
        });
    };
}
//# sourceMappingURL=index.js.map