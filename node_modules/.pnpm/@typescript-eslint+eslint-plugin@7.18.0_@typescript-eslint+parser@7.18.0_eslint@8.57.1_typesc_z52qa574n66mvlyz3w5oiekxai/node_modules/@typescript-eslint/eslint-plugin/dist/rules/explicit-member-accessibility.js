"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
const getMemberHeadLoc_1 = require("../util/getMemberHeadLoc");
exports.default = (0, util_1.createRule)({
    name: 'explicit-member-accessibility',
    meta: {
        hasSuggestions: true,
        type: 'problem',
        docs: {
            description: 'Require explicit accessibility modifiers on class properties and methods',
            // too opinionated to be recommended
        },
        fixable: 'code',
        messages: {
            missingAccessibility: 'Missing accessibility modifier on {{type}} {{name}}.',
            unwantedPublicAccessibility: 'Public accessibility modifier on {{type}} {{name}}.',
            addExplicitAccessibility: "Add '{{ type }}' accessibility modifier",
        },
        schema: [
            {
                $defs: {
                    accessibilityLevel: {
                        oneOf: [
                            {
                                type: 'string',
                                enum: ['explicit'],
                                description: 'Always require an accessor.',
                            },
                            {
                                type: 'string',
                                enum: ['no-public'],
                                description: 'Require an accessor except when public.',
                            },
                            {
                                type: 'string',
                                enum: ['off'],
                                description: 'Never check whether there is an accessor.',
                            },
                        ],
                    },
                },
                type: 'object',
                properties: {
                    accessibility: { $ref: '#/items/0/$defs/accessibilityLevel' },
                    overrides: {
                        type: 'object',
                        properties: {
                            accessors: { $ref: '#/items/0/$defs/accessibilityLevel' },
                            constructors: { $ref: '#/items/0/$defs/accessibilityLevel' },
                            methods: { $ref: '#/items/0/$defs/accessibilityLevel' },
                            properties: { $ref: '#/items/0/$defs/accessibilityLevel' },
                            parameterProperties: {
                                $ref: '#/items/0/$defs/accessibilityLevel',
                            },
                        },
                        additionalProperties: false,
                    },
                    ignoredMethodNames: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [{ accessibility: 'explicit' }],
    create(context, [option]) {
        const baseCheck = option.accessibility ?? 'explicit';
        const overrides = option.overrides ?? {};
        const ctorCheck = overrides.constructors ?? baseCheck;
        const accessorCheck = overrides.accessors ?? baseCheck;
        const methodCheck = overrides.methods ?? baseCheck;
        const propCheck = overrides.properties ?? baseCheck;
        const paramPropCheck = overrides.parameterProperties ?? baseCheck;
        const ignoredMethodNames = new Set(option.ignoredMethodNames ?? []);
        /**
         * Checks if a method declaration has an accessibility modifier.
         * @param methodDefinition The node representing a MethodDefinition.
         */
        function checkMethodAccessibilityModifier(methodDefinition) {
            if (methodDefinition.key.type === utils_1.AST_NODE_TYPES.PrivateIdentifier) {
                return;
            }
            let nodeType = 'method definition';
            let check = baseCheck;
            switch (methodDefinition.kind) {
                case 'method':
                    check = methodCheck;
                    break;
                case 'constructor':
                    check = ctorCheck;
                    break;
                case 'get':
                case 'set':
                    check = accessorCheck;
                    nodeType = `${methodDefinition.kind} property accessor`;
                    break;
            }
            const { name: methodName } = (0, util_1.getNameFromMember)(methodDefinition, context.sourceCode);
            if (check === 'off' || ignoredMethodNames.has(methodName)) {
                return;
            }
            if (check === 'no-public' &&
                methodDefinition.accessibility === 'public') {
                const publicKeyword = findPublicKeyword(methodDefinition);
                context.report({
                    loc: rangeToLoc(context.sourceCode, publicKeyword.range),
                    messageId: 'unwantedPublicAccessibility',
                    data: {
                        type: nodeType,
                        name: methodName,
                    },
                    fix: fixer => fixer.removeRange(publicKeyword.rangeToRemove),
                });
            }
            else if (check === 'explicit' && !methodDefinition.accessibility) {
                context.report({
                    loc: (0, getMemberHeadLoc_1.getMemberHeadLoc)(context.sourceCode, methodDefinition),
                    messageId: 'missingAccessibility',
                    data: {
                        type: nodeType,
                        name: methodName,
                    },
                    suggest: getMissingAccessibilitySuggestions(methodDefinition),
                });
            }
        }
        /**
         * Returns an object containing a range that corresponds to the "public"
         * keyword for a node, and the range that would need to be removed to
         * remove the "public" keyword (including associated whitespace).
         */
        function findPublicKeyword(node) {
            const tokens = context.sourceCode.getTokens(node);
            let rangeToRemove;
            let keywordRange;
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (token.type === utils_1.AST_TOKEN_TYPES.Keyword &&
                    token.value === 'public') {
                    keywordRange = structuredClone(token.range);
                    const commensAfterPublicKeyword = context.sourceCode.getCommentsAfter(token);
                    if (commensAfterPublicKeyword.length) {
                        // public /* Hi there! */ static foo()
                        // ^^^^^^^
                        rangeToRemove = [
                            token.range[0],
                            commensAfterPublicKeyword[0].range[0],
                        ];
                        break;
                    }
                    else {
                        // public static foo()
                        // ^^^^^^^
                        rangeToRemove = [token.range[0], tokens[i + 1].range[0]];
                        break;
                    }
                }
            }
            return { range: keywordRange, rangeToRemove };
        }
        /**
         * Creates a fixer that adds an accessibility modifier keyword
         */
        function getMissingAccessibilitySuggestions(node) {
            function fix(accessibility, fixer) {
                if (node.decorators.length) {
                    const lastDecorator = node.decorators[node.decorators.length - 1];
                    const nextToken = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(lastDecorator), util_1.NullThrowsReasons.MissingToken('token', 'last decorator'));
                    return fixer.insertTextBefore(nextToken, `${accessibility} `);
                }
                return fixer.insertTextBefore(node, `${accessibility} `);
            }
            return [
                {
                    messageId: 'addExplicitAccessibility',
                    data: { type: 'public' },
                    fix: fixer => fix('public', fixer),
                },
                {
                    messageId: 'addExplicitAccessibility',
                    data: { type: 'private' },
                    fix: fixer => fix('private', fixer),
                },
                {
                    messageId: 'addExplicitAccessibility',
                    data: { type: 'protected' },
                    fix: fixer => fix('protected', fixer),
                },
            ];
        }
        /**
         * Checks if property has an accessibility modifier.
         * @param propertyDefinition The node representing a PropertyDefinition.
         */
        function checkPropertyAccessibilityModifier(propertyDefinition) {
            if (propertyDefinition.key.type === utils_1.AST_NODE_TYPES.PrivateIdentifier) {
                return;
            }
            const nodeType = 'class property';
            const { name: propertyName } = (0, util_1.getNameFromMember)(propertyDefinition, context.sourceCode);
            if (propCheck === 'no-public' &&
                propertyDefinition.accessibility === 'public') {
                const publicKeywordRange = findPublicKeyword(propertyDefinition);
                context.report({
                    loc: rangeToLoc(context.sourceCode, publicKeywordRange.range),
                    messageId: 'unwantedPublicAccessibility',
                    data: {
                        type: nodeType,
                        name: propertyName,
                    },
                    fix: fixer => fixer.removeRange(publicKeywordRange.rangeToRemove),
                });
            }
            else if (propCheck === 'explicit' &&
                !propertyDefinition.accessibility) {
                context.report({
                    loc: (0, getMemberHeadLoc_1.getMemberHeadLoc)(context.sourceCode, propertyDefinition),
                    messageId: 'missingAccessibility',
                    data: {
                        type: nodeType,
                        name: propertyName,
                    },
                    suggest: getMissingAccessibilitySuggestions(propertyDefinition),
                });
            }
        }
        /**
         * Checks that the parameter property has the desired accessibility modifiers set.
         * @param node The node representing a Parameter Property
         */
        function checkParameterPropertyAccessibilityModifier(node) {
            const nodeType = 'parameter property';
            // HAS to be an identifier or assignment or TSC will throw
            if (node.parameter.type !== utils_1.AST_NODE_TYPES.Identifier &&
                node.parameter.type !== utils_1.AST_NODE_TYPES.AssignmentPattern) {
                return;
            }
            const nodeName = node.parameter.type === utils_1.AST_NODE_TYPES.Identifier
                ? node.parameter.name
                : // has to be an Identifier or TSC will throw an error
                    node.parameter.left.name;
            switch (paramPropCheck) {
                case 'explicit': {
                    if (!node.accessibility) {
                        context.report({
                            loc: (0, getMemberHeadLoc_1.getParameterPropertyHeadLoc)(context.sourceCode, node, nodeName),
                            messageId: 'missingAccessibility',
                            data: {
                                type: nodeType,
                                name: nodeName,
                            },
                            suggest: getMissingAccessibilitySuggestions(node),
                        });
                    }
                    break;
                }
                case 'no-public': {
                    if (node.accessibility === 'public' && node.readonly) {
                        const publicKeyword = findPublicKeyword(node);
                        context.report({
                            loc: rangeToLoc(context.sourceCode, publicKeyword.range),
                            messageId: 'unwantedPublicAccessibility',
                            data: {
                                type: nodeType,
                                name: nodeName,
                            },
                            fix: fixer => fixer.removeRange(publicKeyword.rangeToRemove),
                        });
                    }
                    break;
                }
            }
        }
        return {
            'MethodDefinition, TSAbstractMethodDefinition': checkMethodAccessibilityModifier,
            'PropertyDefinition, TSAbstractPropertyDefinition': checkPropertyAccessibilityModifier,
            TSParameterProperty: checkParameterPropertyAccessibilityModifier,
        };
    },
});
function rangeToLoc(sourceCode, range) {
    return {
        start: sourceCode.getLocFromIndex(range[0]),
        end: sourceCode.getLocFromIndex(range[1]),
    };
}
//# sourceMappingURL=explicit-member-accessibility.js.map