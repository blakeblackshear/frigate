"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
function createRules(options) {
    const globals = {
        ...(options?.before !== undefined ? { before: options.before } : {}),
        ...(options?.after !== undefined ? { after: options.after } : {}),
    };
    const override = options?.overrides ?? {};
    const colon = {
        ...{ before: false, after: true },
        ...globals,
        ...override.colon,
    };
    const arrow = {
        ...{ before: true, after: true },
        ...globals,
        ...override.arrow,
    };
    return {
        colon: colon,
        arrow: arrow,
        variable: { ...colon, ...override.variable },
        property: { ...colon, ...override.property },
        parameter: { ...colon, ...override.parameter },
        returnType: { ...colon, ...override.returnType },
    };
}
function getIdentifierRules(rules, node) {
    const scope = node?.parent;
    if ((0, util_1.isVariableDeclarator)(scope)) {
        return rules.variable;
    }
    else if ((0, util_1.isFunctionOrFunctionType)(scope)) {
        return rules.parameter;
    }
    return rules.colon;
}
function getRules(rules, node) {
    const scope = node.parent.parent;
    if ((0, util_1.isTSFunctionType)(scope) || (0, util_1.isTSConstructorType)(scope)) {
        return rules.arrow;
    }
    else if ((0, util_1.isIdentifier)(scope)) {
        return getIdentifierRules(rules, scope);
    }
    else if ((0, util_1.isClassOrTypeElement)(scope)) {
        return rules.property;
    }
    else if ((0, util_1.isFunction)(scope)) {
        return rules.returnType;
    }
    return rules.colon;
}
exports.default = (0, util_1.createRule)({
    name: 'type-annotation-spacing',
    meta: {
        deprecated: true,
        replacedBy: ['@stylistic/ts/type-annotation-spacing'],
        type: 'layout',
        docs: {
            description: 'Require consistent spacing around type annotations',
        },
        fixable: 'whitespace',
        messages: {
            expectedSpaceAfter: "Expected a space after the '{{type}}'.",
            expectedSpaceBefore: "Expected a space before the '{{type}}'.",
            unexpectedSpaceAfter: "Unexpected space after the '{{type}}'.",
            unexpectedSpaceBefore: "Unexpected space before the '{{type}}'.",
            unexpectedSpaceBetween: "Unexpected space between the '{{previousToken}}' and the '{{type}}'.",
        },
        schema: [
            {
                $defs: {
                    spacingConfig: {
                        type: 'object',
                        properties: {
                            before: { type: 'boolean' },
                            after: { type: 'boolean' },
                        },
                        additionalProperties: false,
                    },
                },
                type: 'object',
                properties: {
                    before: { type: 'boolean' },
                    after: { type: 'boolean' },
                    overrides: {
                        type: 'object',
                        properties: {
                            colon: { $ref: '#/items/0/$defs/spacingConfig' },
                            arrow: { $ref: '#/items/0/$defs/spacingConfig' },
                            variable: { $ref: '#/items/0/$defs/spacingConfig' },
                            parameter: { $ref: '#/items/0/$defs/spacingConfig' },
                            property: { $ref: '#/items/0/$defs/spacingConfig' },
                            returnType: { $ref: '#/items/0/$defs/spacingConfig' },
                        },
                        additionalProperties: false,
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        // technically there is a default, but the overrides mean
        // that if we apply them here, it will break the no override case.
        {},
    ],
    create(context, [options]) {
        const punctuators = [':', '=>'];
        const ruleSet = createRules(options);
        /**
         * Checks if there's proper spacing around type annotations (no space
         * before colon, one space after).
         */
        function checkTypeAnnotationSpacing(typeAnnotation) {
            const nextToken = typeAnnotation;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const punctuatorTokenEnd = context.sourceCode.getTokenBefore(nextToken);
            let punctuatorTokenStart = punctuatorTokenEnd;
            let previousToken = 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            context.sourceCode.getTokenBefore(punctuatorTokenEnd);
            let type = punctuatorTokenEnd.value;
            if (!punctuators.includes(type)) {
                return;
            }
            const { before, after } = getRules(ruleSet, typeAnnotation);
            if (type === ':' && previousToken.value === '?') {
                if (context.sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart)) {
                    context.report({
                        node: punctuatorTokenStart,
                        messageId: 'unexpectedSpaceBetween',
                        data: {
                            type,
                            previousToken: previousToken.value,
                        },
                        fix(fixer) {
                            return fixer.removeRange([
                                previousToken.range[1],
                                punctuatorTokenStart.range[0],
                            ]);
                        },
                    });
                }
                // shift the start to the ?
                type = '?:';
                punctuatorTokenStart = previousToken;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                previousToken = context.sourceCode.getTokenBefore(previousToken);
                // handle the +/- modifiers for optional modification operators
                if (previousToken.value === '+' || previousToken.value === '-') {
                    type = `${previousToken.value}?:`;
                    punctuatorTokenStart = previousToken;
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    previousToken = context.sourceCode.getTokenBefore(previousToken);
                }
            }
            const previousDelta = punctuatorTokenStart.range[0] - previousToken.range[1];
            const nextDelta = nextToken.range[0] - punctuatorTokenEnd.range[1];
            if (after && nextDelta === 0) {
                context.report({
                    node: punctuatorTokenEnd,
                    messageId: 'expectedSpaceAfter',
                    data: {
                        type,
                    },
                    fix(fixer) {
                        return fixer.insertTextAfter(punctuatorTokenEnd, ' ');
                    },
                });
            }
            else if (!after && nextDelta > 0) {
                context.report({
                    node: punctuatorTokenEnd,
                    messageId: 'unexpectedSpaceAfter',
                    data: {
                        type,
                    },
                    fix(fixer) {
                        return fixer.removeRange([
                            punctuatorTokenEnd.range[1],
                            nextToken.range[0],
                        ]);
                    },
                });
            }
            if (before && previousDelta === 0) {
                context.report({
                    node: punctuatorTokenStart,
                    messageId: 'expectedSpaceBefore',
                    data: {
                        type,
                    },
                    fix(fixer) {
                        return fixer.insertTextAfter(previousToken, ' ');
                    },
                });
            }
            else if (!before && previousDelta > 0) {
                context.report({
                    node: punctuatorTokenStart,
                    messageId: 'unexpectedSpaceBefore',
                    data: {
                        type,
                    },
                    fix(fixer) {
                        return fixer.removeRange([
                            previousToken.range[1],
                            punctuatorTokenStart.range[0],
                        ]);
                    },
                });
            }
        }
        return {
            TSMappedType(node) {
                if (node.typeAnnotation) {
                    checkTypeAnnotationSpacing(node.typeAnnotation);
                }
            },
            TSTypeAnnotation(node) {
                checkTypeAnnotationSpacing(node.typeAnnotation);
            },
        };
    },
});
//# sourceMappingURL=type-annotation-spacing.js.map