"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'no-unnecessary-type-assertion',
    meta: {
        docs: {
            description: 'Disallow type assertions that do not change the type of an expression',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        messages: {
            unnecessaryAssertion: 'This assertion is unnecessary since it does not change the type of the expression.',
            contextuallyUnnecessary: 'This assertion is unnecessary since the receiver accepts the original type of the expression.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    typesToIgnore: {
                        description: 'A list of type names to ignore.',
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                },
            },
        ],
        type: 'suggestion',
    },
    defaultOptions: [{}],
    create(context, [options]) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        const compilerOptions = services.program.getCompilerOptions();
        /**
         * Returns true if there's a chance the variable has been used before a value has been assigned to it
         */
        function isPossiblyUsedBeforeAssigned(node) {
            const declaration = (0, util_1.getDeclaration)(services, node);
            if (!declaration) {
                // don't know what the declaration is for some reason, so just assume the worst
                return true;
            }
            if (
            // non-strict mode doesn't care about used before assigned errors
            tsutils.isStrictCompilerOptionEnabled(compilerOptions, 'strictNullChecks') &&
                // ignore class properties as they are compile time guarded
                // also ignore function arguments as they can't be used before defined
                ts.isVariableDeclaration(declaration) &&
                // is it `const x!: number`
                declaration.initializer === undefined &&
                declaration.exclamationToken === undefined &&
                declaration.type !== undefined) {
                // check if the defined variable type has changed since assignment
                const declarationType = checker.getTypeFromTypeNode(declaration.type);
                const type = (0, util_1.getConstrainedTypeAtLocation)(services, node);
                if (declarationType === type &&
                    // `declare`s are never narrowed, so never skip them
                    !(ts.isVariableDeclarationList(declaration.parent) &&
                        ts.isVariableStatement(declaration.parent.parent) &&
                        tsutils.includesModifier((0, util_1.getModifiers)(declaration.parent.parent), ts.SyntaxKind.DeclareKeyword))) {
                    // possibly used before assigned, so just skip it
                    // better to false negative and skip it, than false positive and fix to compile erroring code
                    //
                    // no better way to figure this out right now
                    // https://github.com/Microsoft/TypeScript/issues/31124
                    return true;
                }
            }
            return false;
        }
        function isConstAssertion(node) {
            return (node.type === utils_1.AST_NODE_TYPES.TSTypeReference &&
                node.typeName.type === utils_1.AST_NODE_TYPES.Identifier &&
                node.typeName.name === 'const');
        }
        function isImplicitlyNarrowedConstDeclaration({ expression, parent, }) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const maybeDeclarationNode = parent.parent;
            const isTemplateLiteralWithExpressions = expression.type === utils_1.AST_NODE_TYPES.TemplateLiteral &&
                expression.expressions.length !== 0;
            return (maybeDeclarationNode.type === utils_1.AST_NODE_TYPES.VariableDeclaration &&
                maybeDeclarationNode.kind === 'const' &&
                /**
                 * Even on `const` variable declarations, template literals with expressions can sometimes be widened without a type assertion.
                 * @see https://github.com/typescript-eslint/typescript-eslint/issues/8737
                 */
                !isTemplateLiteralWithExpressions);
        }
        function isTypeUnchanged(uncast, cast) {
            if (uncast === cast) {
                return true;
            }
            if ((0, util_1.isTypeFlagSet)(uncast, ts.TypeFlags.Undefined) &&
                (0, util_1.isTypeFlagSet)(cast, ts.TypeFlags.Undefined) &&
                tsutils.isCompilerOptionEnabled(compilerOptions, 'exactOptionalPropertyTypes')) {
                const uncastParts = tsutils
                    .unionTypeParts(uncast)
                    .filter(part => !(0, util_1.isTypeFlagSet)(part, ts.TypeFlags.Undefined));
                const castParts = tsutils
                    .unionTypeParts(cast)
                    .filter(part => !(0, util_1.isTypeFlagSet)(part, ts.TypeFlags.Undefined));
                if (uncastParts.length !== castParts.length) {
                    return false;
                }
                const uncastPartsSet = new Set(uncastParts);
                return castParts.every(part => uncastPartsSet.has(part));
            }
            return false;
        }
        return {
            TSNonNullExpression(node) {
                if (node.parent.type === utils_1.AST_NODE_TYPES.AssignmentExpression &&
                    node.parent.operator === '=') {
                    if (node.parent.left === node) {
                        context.report({
                            node,
                            messageId: 'contextuallyUnnecessary',
                            fix(fixer) {
                                return fixer.removeRange([
                                    node.expression.range[1],
                                    node.range[1],
                                ]);
                            },
                        });
                    }
                    // for all other = assignments we ignore non-null checks
                    // this is because non-null assertions can change the type-flow of the code
                    // so whilst they might be unnecessary for the assignment - they are necessary
                    // for following code
                    return;
                }
                const originalNode = services.esTreeNodeToTSNodeMap.get(node);
                const type = (0, util_1.getConstrainedTypeAtLocation)(services, node.expression);
                if (!(0, util_1.isNullableType)(type) && !(0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Void)) {
                    if (node.expression.type === utils_1.AST_NODE_TYPES.Identifier &&
                        isPossiblyUsedBeforeAssigned(node.expression)) {
                        return;
                    }
                    context.report({
                        node,
                        messageId: 'unnecessaryAssertion',
                        fix(fixer) {
                            return fixer.removeRange([node.range[1] - 1, node.range[1]]);
                        },
                    });
                }
                else {
                    // we know it's a nullable type
                    // so figure out if the variable is used in a place that accepts nullable types
                    const contextualType = (0, util_1.getContextualType)(checker, originalNode);
                    if (contextualType) {
                        // in strict mode you can't assign null to undefined, so we have to make sure that
                        // the two types share a nullable type
                        const typeIncludesUndefined = (0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Undefined);
                        const typeIncludesNull = (0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Null);
                        const typeIncludesVoid = (0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Void);
                        const contextualTypeIncludesUndefined = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Undefined);
                        const contextualTypeIncludesNull = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Null);
                        const contextualTypeIncludesVoid = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Void);
                        // make sure that the parent accepts the same types
                        // i.e. assigning `string | null | undefined` to `string | undefined` is invalid
                        const isValidUndefined = typeIncludesUndefined
                            ? contextualTypeIncludesUndefined
                            : true;
                        const isValidNull = typeIncludesNull
                            ? contextualTypeIncludesNull
                            : true;
                        const isValidVoid = typeIncludesVoid
                            ? contextualTypeIncludesVoid
                            : true;
                        if (isValidUndefined && isValidNull && isValidVoid) {
                            context.report({
                                node,
                                messageId: 'contextuallyUnnecessary',
                                fix(fixer) {
                                    return fixer.removeRange([
                                        node.expression.range[1],
                                        node.range[1],
                                    ]);
                                },
                            });
                        }
                    }
                }
            },
            'TSAsExpression, TSTypeAssertion'(node) {
                if (options.typesToIgnore?.includes(context.sourceCode.getText(node.typeAnnotation))) {
                    return;
                }
                const castType = services.getTypeAtLocation(node);
                const uncastType = services.getTypeAtLocation(node.expression);
                const typeIsUnchanged = isTypeUnchanged(uncastType, castType);
                const wouldSameTypeBeInferred = castType.isLiteral()
                    ? isImplicitlyNarrowedConstDeclaration(node)
                    : !isConstAssertion(node.typeAnnotation);
                if (typeIsUnchanged && wouldSameTypeBeInferred) {
                    context.report({
                        node,
                        messageId: 'unnecessaryAssertion',
                        fix(fixer) {
                            if (node.type === utils_1.AST_NODE_TYPES.TSTypeAssertion) {
                                const openingAngleBracket = (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(node.typeAnnotation, token => token.type === utils_1.AST_TOKEN_TYPES.Punctuator &&
                                    token.value === '<'), util_1.NullThrowsReasons.MissingToken('<', 'type annotation'));
                                const closingAngleBracket = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(node.typeAnnotation, token => token.type === utils_1.AST_TOKEN_TYPES.Punctuator &&
                                    token.value === '>'), util_1.NullThrowsReasons.MissingToken('>', 'type annotation'));
                                // < ( number ) > ( 3 + 5 )
                                // ^---remove---^
                                return fixer.removeRange([
                                    openingAngleBracket.range[0],
                                    closingAngleBracket.range[1],
                                ]);
                            }
                            // `as` is always present in TSAsExpression
                            const asToken = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(node.expression, token => token.type === utils_1.AST_TOKEN_TYPES.Identifier &&
                                token.value === 'as'), util_1.NullThrowsReasons.MissingToken('>', 'type annotation'));
                            const tokenBeforeAs = (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(asToken, {
                                includeComments: true,
                            }), util_1.NullThrowsReasons.MissingToken('comment', 'as'));
                            // ( 3 + 5 )  as  number
                            //          ^--remove--^
                            return fixer.removeRange([tokenBeforeAs.range[1], node.range[1]]);
                        },
                    });
                }
                // TODO - add contextually unnecessary check for this
            },
        };
    },
});
//# sourceMappingURL=no-unnecessary-type-assertion.js.map