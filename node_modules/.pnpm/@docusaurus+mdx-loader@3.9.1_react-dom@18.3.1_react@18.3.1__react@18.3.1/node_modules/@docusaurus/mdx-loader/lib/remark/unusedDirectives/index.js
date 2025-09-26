"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path_1 = tslib_1.__importDefault(require("path"));
const process_1 = tslib_1.__importDefault(require("process"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const utils_2 = require("../utils");
const directiveTypes = [
    'containerDirective',
    'leafDirective',
    'textDirective',
];
const directivePrefixMap = {
    textDirective: ':',
    leafDirective: '::',
    containerDirective: ':::',
};
function formatDirectiveName(directive) {
    const prefix = directivePrefixMap[directive.type];
    if (!prefix) {
        throw new Error(`unexpected, no prefix found for directive of type ${directive.type}`);
    }
    // To simplify we don't display the eventual label/props of directives
    return `${prefix}${directive.name}`;
}
function formatUnusedDirectiveMessage(directive) {
    const name = formatDirectiveName(directive);
    return `- ${name}${(0, utils_2.formatNodePositionExtraMessage)(directive)}`;
}
function formatUnusedDirectivesMessage({ directives, filePath, }) {
    const supportUrl = 'https://github.com/facebook/docusaurus/pull/9394';
    const customPath = (0, utils_1.posixPath)(path_1.default.relative(process_1.default.cwd(), filePath));
    const warningTitle = logger_1.default.interpolate `Docusaurus found ${directives.length} unused Markdown directives in file path=${customPath}`;
    const customSupportUrl = logger_1.default.interpolate `url=${supportUrl}`;
    const warningMessages = directives
        .map(formatUnusedDirectiveMessage)
        .join('\n');
    return `${warningTitle}
${warningMessages}
Your content might render in an unexpected way. Visit ${customSupportUrl} to find out why and how to fix it.`;
}
function logUnusedDirectivesWarning({ directives, filePath, }) {
    if (directives.length > 0) {
        const message = formatUnusedDirectivesMessage({
            directives,
            filePath,
        });
        logger_1.default.warn(message);
    }
}
function isTextDirective(directive) {
    return directive.type === 'textDirective';
}
// A simple text directive is one without any label/props
function isSimpleTextDirective(directive) {
    if (isTextDirective(directive)) {
        // Attributes in MDAST = Directive props
        const hasAttributes = directive.attributes && Object.keys(directive.attributes).length > 0;
        // Children in MDAST = Directive label
        const hasChildren = directive.children.length > 0;
        return !hasAttributes && !hasChildren;
    }
    return false;
}
function transformSimpleTextDirectiveToString(textDirective) {
    (0, utils_2.transformNode)(textDirective, {
        type: 'text',
        value: `:${textDirective.name}`, // We ignore label/props on purpose here
    });
}
function isUnusedDirective(directive) {
    // If directive data is set (notably hName/hProperties set by admonitions)
    // this usually means the directive has been handled by another plugin
    return !directive.data;
}
const plugin = function plugin() {
    return async (tree, file) => {
        const { visit } = await import('unist-util-visit');
        const unusedDirectives = [];
        // @ts-expect-error: TODO fix type
        visit(tree, directiveTypes, (directive) => {
            // If directive data is set (hName/hProperties set by admonitions)
            // this usually means the directive has been handled by another plugin
            if (isUnusedDirective(directive)) {
                if (isSimpleTextDirective(directive)) {
                    transformSimpleTextDirectiveToString(directive);
                }
                else {
                    unusedDirectives.push(directive);
                }
            }
        });
        // We only enable these warnings for the client compiler
        // This avoids emitting duplicate warnings in prod mode
        // Note: the client compiler is used in both dev/prod modes
        // Also: the client compiler is what gets used when using crossCompilerCache
        if (file.data.compilerName === 'client') {
            logUnusedDirectivesWarning({
                directives: unusedDirectives,
                filePath: file.path,
            });
        }
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map