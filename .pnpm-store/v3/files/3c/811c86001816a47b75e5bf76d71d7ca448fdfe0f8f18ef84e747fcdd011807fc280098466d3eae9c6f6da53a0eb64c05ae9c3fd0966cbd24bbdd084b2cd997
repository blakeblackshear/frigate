"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function createTocSliceImportName({ tocExportName, componentName, }) {
    // The name of the toc slice import alias doesn't matter much
    // We just need to ensure it's valid and won't conflict with other names
    return `__${tocExportName}${componentName}`;
}
async function collectImportsExports({ root, tocExportName, }) {
    const { visit } = await import('unist-util-visit');
    const markdownImports = new Map();
    let existingTocExport = null;
    visit(root, 'mdxjsEsm', (node) => {
        if (!node.data?.estree) {
            return;
        }
        if ((0, utils_1.isNamedExport)(node, tocExportName)) {
            existingTocExport = node;
        }
        (0, utils_1.getImportDeclarations)(node.data.estree).forEach((declaration) => {
            if (!(0, utils_1.isMarkdownImport)(declaration)) {
                return;
            }
            const componentName = (0, utils_1.findDefaultImportName)(declaration);
            if (!componentName) {
                return;
            }
            markdownImports.set(componentName, {
                declaration,
            });
        });
    });
    return { markdownImports, existingTocExport };
}
async function collectTOCItems({ root, tocExportName, markdownImports, }) {
    const { toString } = await import('mdast-util-to-string');
    const { visit } = await import('unist-util-visit');
    const tocItems = [];
    visit(root, (child) => {
        if (child.type === 'heading') {
            visitHeading(child);
        }
        else if (child.type === 'mdxJsxFlowElement') {
            visitJSXElement(child);
        }
    });
    return { tocItems };
    // Visit Markdown headings
    function visitHeading(node) {
        const value = toString(node);
        // depth:1 headings are titles and not included in the TOC
        if (!value || node.depth < 2) {
            return;
        }
        tocItems.push({
            type: 'heading',
            heading: node,
        });
    }
    // Visit JSX elements, such as <Partial/>
    function visitJSXElement(node) {
        const componentName = node.name;
        if (!componentName) {
            return;
        }
        const importDeclaration = markdownImports.get(componentName)?.declaration;
        if (!importDeclaration) {
            return;
        }
        const tocSliceImportName = createTocSliceImportName({
            tocExportName,
            componentName,
        });
        tocItems.push({
            type: 'slice',
            importName: tocSliceImportName,
        });
        (0, utils_1.addTocSliceImportIfNeeded)({
            importDeclaration,
            tocExportName,
            tocSliceImportName,
        });
    }
}
const plugin = function plugin(options = {}) {
    const tocExportName = options.name || 'toc';
    return async (root) => {
        const { markdownImports, existingTocExport } = await collectImportsExports({
            root,
            tocExportName,
        });
        // If user explicitly writes "export const toc" in his mdx file
        // We keep it as is do not override their explicit toc structure
        // See https://github.com/facebook/docusaurus/pull/7530#discussion_r1458087876
        if (existingTocExport) {
            return;
        }
        const { tocItems } = await collectTOCItems({
            root,
            tocExportName,
            markdownImports,
        });
        root.children.push(await (0, utils_1.createTOCExportNodeAST)({
            tocExportName,
            tocItems,
        }));
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map