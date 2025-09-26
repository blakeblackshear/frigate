"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const getESLintCoreRule_1 = require("../util/getESLintCoreRule");
const baseRule = (0, getESLintCoreRule_1.getESLintCoreRule)('space-before-blocks');
exports.default = (0, util_1.createRule)({
    name: 'space-before-blocks',
    meta: {
        deprecated: true,
        replacedBy: ['@stylistic/ts/space-before-blocks'],
        type: 'layout',
        docs: {
            description: 'Enforce consistent spacing before blocks',
            extendsBaseRule: true,
        },
        fixable: baseRule.meta.fixable,
        hasSuggestions: baseRule.meta.hasSuggestions,
        schema: baseRule.meta.schema,
        messages: {
            // @ts-expect-error -- we report on this messageId so we need to ensure it's there in case ESLint changes in future
            unexpectedSpace: 'Unexpected space before opening brace.',
            // @ts-expect-error -- we report on this messageId so we need to ensure it's there in case ESLint changes in future
            missingSpace: 'Missing space before opening brace.',
            ...baseRule.meta.messages,
        },
    },
    defaultOptions: ['always'],
    create(context, [config]) {
        const rules = baseRule.create(context);
        let requireSpace = true;
        if (typeof config === 'object') {
            requireSpace = config.classes === 'always';
        }
        else if (config === 'never') {
            requireSpace = false;
        }
        function checkPrecedingSpace(node) {
            const precedingToken = context.sourceCode.getTokenBefore(node);
            if (precedingToken && (0, util_1.isTokenOnSameLine)(precedingToken, node)) {
                const hasSpace = context.sourceCode.isSpaceBetween(precedingToken, node);
                if (requireSpace && !hasSpace) {
                    context.report({
                        node,
                        messageId: 'missingSpace',
                        fix(fixer) {
                            return fixer.insertTextBefore(node, ' ');
                        },
                    });
                }
                else if (!requireSpace && hasSpace) {
                    context.report({
                        node,
                        messageId: 'unexpectedSpace',
                        fix(fixer) {
                            return fixer.removeRange([
                                precedingToken.range[1],
                                node.range[0],
                            ]);
                        },
                    });
                }
            }
        }
        function checkSpaceAfterEnum(node) {
            const punctuator = context.sourceCode.getTokenAfter(node.id);
            if (punctuator) {
                checkPrecedingSpace(punctuator);
            }
        }
        return {
            ...rules,
            TSEnumDeclaration: checkSpaceAfterEnum,
            TSInterfaceBody: checkPrecedingSpace,
        };
    },
});
//# sourceMappingURL=space-before-blocks.js.map