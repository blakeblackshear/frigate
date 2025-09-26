"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImportDeclarations = getImportDeclarations;
exports.isMarkdownImport = isMarkdownImport;
exports.findDefaultImportName = findDefaultImportName;
exports.findNamedImportSpecifier = findNamedImportSpecifier;
exports.addTocSliceImportIfNeeded = addTocSliceImportIfNeeded;
exports.isNamedExport = isNamedExport;
exports.createTOCExportNodeAST = createTOCExportNodeAST;
exports.toHeadingHTMLValue = toHeadingHTMLValue;
const tslib_1 = require("tslib");
const escape_html_1 = tslib_1.__importDefault(require("escape-html"));
function getImportDeclarations(program) {
    return program.body.filter((item) => item.type === 'ImportDeclaration');
}
function isMarkdownImport(node) {
    if (node.type !== 'ImportDeclaration') {
        return false;
    }
    const importPath = node.source.value;
    return typeof importPath === 'string' && /\.mdx?$/.test(importPath);
}
function findDefaultImportName(importDeclaration) {
    return importDeclaration.specifiers.find((o) => o.type === 'ImportDefaultSpecifier')?.local.name;
}
function findNamedImportSpecifier(importDeclaration, localName) {
    return importDeclaration?.specifiers.find((specifier) => specifier.type === 'ImportSpecifier' &&
        specifier.local.name === localName);
}
// Before: import Partial from "partial"
// After: import Partial, {toc as __tocPartial} from "partial"
function addTocSliceImportIfNeeded({ importDeclaration, tocExportName, tocSliceImportName, }) {
    // We only add the toc slice named import if it doesn't exist already
    if (!findNamedImportSpecifier(importDeclaration, tocSliceImportName)) {
        importDeclaration.specifiers.push({
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: tocExportName },
            local: { type: 'Identifier', name: tocSliceImportName },
        });
    }
}
function isNamedExport(node, exportName) {
    if (node.type !== 'mdxjsEsm') {
        return false;
    }
    const program = node.data?.estree;
    if (!program) {
        return false;
    }
    if (program.body.length !== 1) {
        return false;
    }
    const exportDeclaration = program.body[0];
    if (exportDeclaration.type !== 'ExportNamedDeclaration') {
        return false;
    }
    const variableDeclaration = exportDeclaration.declaration;
    if (variableDeclaration?.type !== 'VariableDeclaration') {
        return false;
    }
    const { id } = variableDeclaration.declarations[0];
    if (id.type !== 'Identifier') {
        return false;
    }
    return id.name === exportName;
}
async function createTOCExportNodeAST({ tocExportName, tocItems, }) {
    function createTOCSliceAST(tocSlice) {
        return {
            type: 'SpreadElement',
            argument: { type: 'Identifier', name: tocSlice.importName },
        };
    }
    async function createTOCHeadingAST({ heading }) {
        const { toString } = await import('mdast-util-to-string');
        const { valueToEstree } = await import('estree-util-value-to-estree');
        const value = {
            value: toHeadingHTMLValue(heading, toString),
            id: heading.data.id,
            level: heading.depth,
        };
        return valueToEstree(value);
    }
    async function createTOCItemAST(tocItem) {
        switch (tocItem.type) {
            case 'slice':
                return createTOCSliceAST(tocItem);
            case 'heading':
                return createTOCHeadingAST(tocItem);
            default: {
                throw new Error(`unexpected toc item type`);
            }
        }
    }
    return {
        type: 'mdxjsEsm',
        value: '', // See https://github.com/facebook/docusaurus/pull/9684#discussion_r1457595181
        data: {
            estree: {
                type: 'Program',
                body: [
                    {
                        type: 'ExportNamedDeclaration',
                        declaration: {
                            type: 'VariableDeclaration',
                            declarations: [
                                {
                                    type: 'VariableDeclarator',
                                    id: {
                                        type: 'Identifier',
                                        name: tocExportName,
                                    },
                                    init: {
                                        type: 'ArrayExpression',
                                        elements: await Promise.all(tocItems.map(createTOCItemAST)),
                                    },
                                },
                            ],
                            kind: 'const',
                        },
                        specifiers: [],
                        source: null,
                    },
                ],
                sourceType: 'module',
            },
        },
    };
}
function stringifyChildren(node, toString) {
    return node.children
        .map((item) => toHeadingHTMLValue(item, toString))
        .join('')
        .trim();
}
// TODO This is really a workaround, and not super reliable
// For now we only support serializing tagName, className and content
// Can we implement the TOC with real JSX nodes instead of html strings later?
function mdxJsxTextElementToHtml(element, toString) {
    const tag = element.name;
    // See https://github.com/facebook/docusaurus/issues/11003#issuecomment-2733925363
    if (tag === 'img') {
        return '';
    }
    const attributes = element.attributes.filter((child) => child.type === 'mdxJsxAttribute');
    const classAttribute = attributes.find((attr) => attr.name === 'className') ??
        attributes.find((attr) => attr.name === 'class');
    const classAttributeString = classAttribute
        ? `class="${(0, escape_html_1.default)(String(classAttribute.value))}"`
        : ``;
    const allAttributes = classAttributeString ? ` ${classAttributeString}` : '';
    const content = stringifyChildren(element, toString);
    return `<${tag}${allAttributes}>${content}</${tag}>`;
}
function toHeadingHTMLValue(node, toString) {
    switch (node.type) {
        case 'mdxJsxTextElement': {
            return mdxJsxTextElementToHtml(node, toString);
        }
        case 'text':
            return (0, escape_html_1.default)(node.value);
        case 'heading':
            return stringifyChildren(node, toString);
        case 'inlineCode':
            return `<code>${(0, escape_html_1.default)(node.value)}</code>`;
        case 'emphasis':
            return `<em>${stringifyChildren(node, toString)}</em>`;
        case 'strong':
            return `<strong>${stringifyChildren(node, toString)}</strong>`;
        case 'delete':
            return `<del>${stringifyChildren(node, toString)}</del>`;
        case 'link':
            return stringifyChildren(node, toString);
        default:
            return toString(node);
    }
}
//# sourceMappingURL=utils.js.map