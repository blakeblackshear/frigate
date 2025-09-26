"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformNode = transformNode;
exports.assetRequireAttributeValue = assetRequireAttributeValue;
exports.formatNodePositionExtraMessage = formatNodePositionExtraMessage;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
/**
 * Util to transform one node type to another node type
 * The input node is mutated in place
 * @param node the node to mutate
 * @param newNode what the original node should become become
 */
function transformNode(node, newNode) {
    Object.keys(node).forEach((key) => {
        // @ts-expect-error: unsafe but ok
        delete node[key];
    });
    Object.keys(newNode).forEach((key) => {
        // @ts-expect-error: unsafe but ok
        node[key] = newNode[key];
    });
    return node;
}
function assetRequireAttributeValue(requireString, hash) {
    return {
        type: 'mdxJsxAttributeValueExpression',
        value: `require("${requireString}").default${hash && ` + '${hash}'`}`,
        data: {
            estree: {
                type: 'Program',
                body: [
                    {
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'BinaryExpression',
                            left: {
                                type: 'MemberExpression',
                                object: {
                                    type: 'CallExpression',
                                    callee: {
                                        type: 'Identifier',
                                        name: 'require',
                                    },
                                    arguments: [
                                        {
                                            type: 'Literal',
                                            value: requireString,
                                            raw: `"${requireString}"`,
                                        },
                                    ],
                                    optional: false,
                                },
                                property: {
                                    type: 'Identifier',
                                    name: 'default',
                                },
                                computed: false,
                                optional: false,
                            },
                            operator: '+',
                            right: {
                                type: 'Literal',
                                value: hash,
                                raw: `"${hash}"`,
                            },
                        },
                    },
                ],
                sourceType: 'module',
                comments: [],
            },
        },
    };
}
function formatNodePosition(node) {
    return node.position?.start
        ? logger_1.default.interpolate `number=${node.position.start.line}:number=${node.position.start.column}`
        : undefined;
}
// Returns " (line:column)" when position info is available
// The initial space is useful to append easily to any existing message
function formatNodePositionExtraMessage(node) {
    const position = formatNodePosition(node);
    return `${position ? ` (${position})` : ''}`;
}
//# sourceMappingURL=index.js.map