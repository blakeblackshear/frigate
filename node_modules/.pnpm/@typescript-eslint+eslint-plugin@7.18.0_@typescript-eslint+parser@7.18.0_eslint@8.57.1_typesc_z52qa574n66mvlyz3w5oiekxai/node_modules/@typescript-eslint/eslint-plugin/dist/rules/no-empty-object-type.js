"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
const noEmptyMessage = (emptyType) => [
    `${emptyType} allows any non-nullish value, including literals like \`0\` and \`""\`.`,
    "- If that's what you want, disable this lint rule with an inline comment or configure the '{{ option }}' rule option.",
    '- If you want a type meaning "any object", you probably want `object` instead.',
    '- If you want a type meaning "any value", you probably want `unknown` instead.',
].join('\n');
exports.default = (0, util_1.createRule)({
    name: 'no-empty-object-type',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow accidentally using the "empty object" type',
        },
        hasSuggestions: true,
        messages: {
            noEmptyInterface: noEmptyMessage('An empty interface declaration'),
            noEmptyObject: noEmptyMessage('The `{}` ("empty object") type'),
            noEmptyInterfaceWithSuper: 'An interface declaring no members is equivalent to its supertype.',
            replaceEmptyInterface: 'Replace empty interface with `{{replacement}}`.',
            replaceEmptyInterfaceWithSuper: 'Replace empty interface with a type alias.',
            replaceEmptyObjectType: 'Replace `{}` with `{{replacement}}`.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    allowInterfaces: {
                        enum: ['always', 'never', 'with-single-extends'],
                        type: 'string',
                    },
                    allowObjectTypes: {
                        enum: ['always', 'in-type-alias-with-name', 'never'],
                        type: 'string',
                    },
                    allowWithName: {
                        type: 'string',
                    },
                },
            },
        ],
    },
    defaultOptions: [
        {
            allowInterfaces: 'never',
            allowObjectTypes: 'never',
        },
    ],
    create(context, [{ allowInterfaces, allowWithName, allowObjectTypes }]) {
        const allowWithNameTester = allowWithName
            ? new RegExp(allowWithName, 'u')
            : undefined;
        return {
            ...(allowInterfaces !== 'always' && {
                TSInterfaceDeclaration(node) {
                    if (allowWithNameTester?.test(node.id.name)) {
                        return;
                    }
                    const extend = node.extends;
                    if (node.body.body.length !== 0 ||
                        (extend.length === 1 &&
                            allowInterfaces === 'with-single-extends') ||
                        extend.length > 1) {
                        return;
                    }
                    const scope = context.sourceCode.getScope(node);
                    const mergedWithClassDeclaration = scope.set
                        .get(node.id.name)
                        ?.defs.some(def => def.node.type === utils_1.AST_NODE_TYPES.ClassDeclaration);
                    if (extend.length === 0) {
                        context.report({
                            data: { option: 'allowInterfaces' },
                            node: node.id,
                            messageId: 'noEmptyInterface',
                            ...(!mergedWithClassDeclaration && {
                                suggest: ['object', 'unknown'].map(replacement => ({
                                    data: { replacement },
                                    fix(fixer) {
                                        const id = context.sourceCode.getText(node.id);
                                        const typeParam = node.typeParameters
                                            ? context.sourceCode.getText(node.typeParameters)
                                            : '';
                                        return fixer.replaceText(node, `type ${id}${typeParam} = ${replacement}`);
                                    },
                                    messageId: 'replaceEmptyInterface',
                                })),
                            }),
                        });
                        return;
                    }
                    context.report({
                        node: node.id,
                        messageId: 'noEmptyInterfaceWithSuper',
                        ...(!mergedWithClassDeclaration && {
                            suggest: [
                                {
                                    fix(fixer) {
                                        const extended = context.sourceCode.getText(extend[0]);
                                        const id = context.sourceCode.getText(node.id);
                                        const typeParam = node.typeParameters
                                            ? context.sourceCode.getText(node.typeParameters)
                                            : '';
                                        return fixer.replaceText(node, `type ${id}${typeParam} = ${extended}`);
                                    },
                                    messageId: 'replaceEmptyInterfaceWithSuper',
                                },
                            ],
                        }),
                    });
                },
            }),
            ...(allowObjectTypes !== 'always' && {
                TSTypeLiteral(node) {
                    if (node.members.length ||
                        node.parent.type === utils_1.AST_NODE_TYPES.TSIntersectionType ||
                        (allowWithNameTester &&
                            node.parent.type === utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration &&
                            allowWithNameTester.test(node.parent.id.name))) {
                        return;
                    }
                    context.report({
                        data: { option: 'allowObjectTypes' },
                        messageId: 'noEmptyObject',
                        node,
                        suggest: ['object', 'unknown'].map(replacement => ({
                            data: { replacement },
                            messageId: 'replaceEmptyObjectType',
                            fix: (fixer) => fixer.replaceText(node, replacement),
                        })),
                    });
                },
            }),
        };
    },
});
//# sourceMappingURL=no-empty-object-type.js.map