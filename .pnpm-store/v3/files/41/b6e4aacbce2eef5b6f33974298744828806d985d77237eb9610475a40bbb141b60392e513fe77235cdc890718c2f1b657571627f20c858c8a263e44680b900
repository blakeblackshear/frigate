"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAllSourceCodeFileTranslations = extractAllSourceCodeFileTranslations;
exports.extractSourceCodeFileTranslations = extractSourceCodeFileTranslations;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const traverse_1 = tslib_1.__importDefault(require("@babel/traverse"));
const generator_1 = tslib_1.__importDefault(require("@babel/generator"));
const core_1 = require("@babel/core");
async function extractAllSourceCodeFileTranslations(sourceCodeFilePaths, babelOptions) {
    return Promise.all(sourceCodeFilePaths.flatMap((sourceFilePath) => extractSourceCodeFileTranslations(sourceFilePath, babelOptions)));
}
async function extractSourceCodeFileTranslations(sourceCodeFilePath, babelOptions) {
    try {
        const code = await fs_extra_1.default.readFile(sourceCodeFilePath, 'utf8');
        const ast = (0, core_1.parse)(code, {
            ...babelOptions,
            ast: true,
            // filename is important, because babel does not process the same files
            // according to their js/ts extensions.
            // See https://x.com/NicoloRibaudo/status/1321130735605002243
            filename: sourceCodeFilePath,
        });
        const translations = extractSourceCodeAstTranslations(ast, sourceCodeFilePath);
        return translations;
    }
    catch (err) {
        logger_1.default.error `Error while attempting to extract Docusaurus translations from source code file at path=${sourceCodeFilePath}.`;
        throw err;
    }
}
/*
Need help understanding this?

Useful resources:
https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
https://github.com/formatjs/formatjs/blob/main/packages/babel-plugin-formatjs/index.ts
https://github.com/pugjs/babel-walk
 */
function extractSourceCodeAstTranslations(ast, sourceCodeFilePath) {
    function sourceWarningPart(node) {
        return `File: ${sourceCodeFilePath} at line ${node.loc?.start.line ?? '?'}
Full code: ${(0, generator_1.default)(node).code}`;
    }
    const translations = {};
    const warnings = [];
    let translateComponentName;
    let translateFunctionName;
    // First pass: find import declarations of Translate / translate.
    // If not found, don't process the rest to avoid false positives
    (0, traverse_1.default)(ast, {
        ImportDeclaration(path) {
            if (path.node.importKind === 'type' ||
                path.get('source').node.value !== '@docusaurus/Translate') {
                return;
            }
            const importSpecifiers = path.get('specifiers');
            const defaultImport = importSpecifiers.find((specifier) => specifier.node.type === 'ImportDefaultSpecifier');
            const callbackImport = importSpecifiers.find((specifier) => specifier.node.type === 'ImportSpecifier' &&
                (specifier.get('imported')
                    .node.name === 'translate' ||
                    specifier.get('imported')
                        .node.value === 'translate'));
            translateComponentName = defaultImport?.get('local').node.name;
            translateFunctionName = callbackImport?.get('local').node.name;
        },
    });
    (0, traverse_1.default)(ast, {
        ...(translateComponentName && {
            JSXElement(path) {
                if (!path
                    .get('openingElement')
                    .get('name')
                    .isJSXIdentifier({ name: translateComponentName })) {
                    return;
                }
                function evaluateJSXProp(propName) {
                    const attributePath = path
                        .get('openingElement.attributes')
                        .find((attr) => attr.isJSXAttribute() &&
                        attr.get('name').isJSXIdentifier({ name: propName }));
                    if (attributePath) {
                        const attributeValue = attributePath.get('value');
                        const attributeValueEvaluated = attributeValue.isJSXExpressionContainer()
                            ? attributeValue.get('expression').evaluate()
                            : attributeValue.evaluate();
                        if (attributeValueEvaluated.confident &&
                            typeof attributeValueEvaluated.value === 'string') {
                            return attributeValueEvaluated.value;
                        }
                        warnings.push(`<Translate> prop=${propName} should be a statically evaluable object.
Example: <Translate id="optional id" description="optional description">Message</Translate>
Dynamically constructed values are not allowed, because they prevent translations to be extracted.
${sourceWarningPart(path.node)}`);
                    }
                    return undefined;
                }
                const id = evaluateJSXProp('id');
                const description = evaluateJSXProp('description');
                let message;
                const childrenPath = path.get('children');
                // Handle empty content
                if (!childrenPath.length) {
                    if (!id) {
                        warnings.push(`<Translate> without children must have id prop.
Example: <Translate id="my-id" />
${sourceWarningPart(path.node)}`);
                    }
                    else {
                        translations[id] = {
                            message: id,
                            ...(description && { description }),
                        };
                    }
                    return;
                }
                // Handle single non-empty content
                const singleChildren = childrenPath
                    // Remove empty/useless text nodes that might be around our
                    // translation! Makes the translation system more reliable to JSX
                    // formatting issues
                    .filter((children) => !(children.isJSXText() &&
                    children.node.value.replace('\n', '').trim() === ''))
                    .pop();
                const isJSXText = singleChildren?.isJSXText();
                const isJSXExpressionContainer = singleChildren?.isJSXExpressionContainer() &&
                    singleChildren.get('expression').evaluate().confident;
                if (isJSXText || isJSXExpressionContainer) {
                    message = isJSXText
                        ? singleChildren.node.value.trim().replace(/\s+/g, ' ')
                        : String(singleChildren.get('expression').evaluate().value);
                    translations[id ?? message] = {
                        message,
                        ...(description && { description }),
                    };
                }
                else {
                    warnings.push(`Translate content could not be extracted. It has to be a static string and use optional but static props, like <Translate id="my-id" description="my-description">text</Translate>.
${sourceWarningPart(path.node)}`);
                }
            },
        }),
        ...(translateFunctionName && {
            CallExpression(path) {
                if (!path.get('callee').isIdentifier({ name: translateFunctionName })) {
                    return;
                }
                const args = path.get('arguments');
                if (args.length === 1 || args.length === 2) {
                    const firstArgPath = args[0];
                    // translate("x" + "y"); => translate("xy");
                    const firstArgEvaluated = firstArgPath.evaluate();
                    if (firstArgEvaluated.confident &&
                        typeof firstArgEvaluated.value === 'object') {
                        const { message, id, description } = firstArgEvaluated.value;
                        translations[String(id ?? message)] = {
                            message: String(message ?? id),
                            ...(Boolean(description) && { description: String(description) }),
                        };
                    }
                    else {
                        warnings.push(`translate() first arg should be a statically evaluable object.
Example: translate({message: "text",id: "optional.id",description: "optional description"}
Dynamically constructed values are not allowed, because they prevent translations to be extracted.
${sourceWarningPart(path.node)}`);
                    }
                }
                else {
                    warnings.push(`translate() function only takes 1 or 2 args
${sourceWarningPart(path.node)}`);
                }
            },
        }),
    });
    return { sourceCodeFilePath, translations, warnings };
}
//# sourceMappingURL=babelTranslationsExtractor.js.map