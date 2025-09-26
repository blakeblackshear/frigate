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
const util_1 = require("../util");
const useUnknownMessageBase = 'Prefer the safe `: unknown` for a catch callback variable.';
exports.default = (0, util_1.createRule)({
    name: 'use-unknown-in-catch-callback-variable',
    meta: {
        docs: {
            description: 'Enforce typing arguments in `.catch()` callbacks as `unknown`',
            requiresTypeChecking: true,
            recommended: 'strict',
        },
        type: 'suggestion',
        messages: {
            useUnknown: useUnknownMessageBase,
            useUnknownArrayDestructuringPattern: useUnknownMessageBase + ' The thrown error may not be iterable.',
            useUnknownObjectDestructuringPattern: useUnknownMessageBase +
                ' The thrown error may be nullable, or may not have the expected shape.',
            useUnknownSpreadArgs: useUnknownMessageBase +
                ' The argument list may contain a handler that does not use `unknown` for the catch callback variable.',
            addUnknownTypeAnnotationSuggestion: 'Add an explicit `: unknown` type annotation to the catch variable.',
            addUnknownRestTypeAnnotationSuggestion: 'Add an explicit `: [unknown]` type annotation to the catch rest variable.',
            wrongTypeAnnotationSuggestion: 'Change existing type annotation to `: unknown`.',
            wrongRestTypeAnnotationSuggestion: 'Change existing type annotation to `: [unknown]`.',
        },
        fixable: 'code',
        schema: [],
        hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        function isPromiseCatchAccess(node) {
            if (!(node.type === utils_1.AST_NODE_TYPES.MemberExpression &&
                isStaticMemberAccessOfValue(node, 'catch'))) {
                return false;
            }
            const objectTsNode = services.esTreeNodeToTSNodeMap.get(node.object);
            const tsNode = services.esTreeNodeToTSNodeMap.get(node);
            return tsutils.isThenableType(checker, tsNode, checker.getTypeAtLocation(objectTsNode));
        }
        function isFlaggableHandlerType(type) {
            for (const unionPart of tsutils.unionTypeParts(type)) {
                const callSignatures = tsutils.getCallSignaturesOfType(unionPart);
                if (callSignatures.length === 0) {
                    // Ignore any non-function components to the type. Those are not this rule's problem.
                    continue;
                }
                for (const callSignature of callSignatures) {
                    const firstParam = callSignature.parameters.at(0);
                    if (!firstParam) {
                        // it's not an issue if there's no catch variable at all.
                        continue;
                    }
                    let firstParamType = checker.getTypeOfSymbol(firstParam);
                    const decl = firstParam.valueDeclaration;
                    if (decl != null && (0, util_1.isRestParameterDeclaration)(decl)) {
                        if (checker.isArrayType(firstParamType)) {
                            firstParamType = checker.getTypeArguments(firstParamType)[0];
                        }
                        else if (checker.isTupleType(firstParamType)) {
                            firstParamType = checker.getTypeArguments(firstParamType)[0];
                        }
                        else {
                            // a rest arg that's not an array or tuple should definitely be flagged.
                            return true;
                        }
                    }
                    if (!tsutils.isIntrinsicUnknownType(firstParamType)) {
                        return true;
                    }
                }
            }
            return false;
        }
        /**
         * If passed an ordinary expression, this will check it as expected.
         *
         * If passed a spread element, it treats it as the union of unwrapped array/tuple type.
         */
        function shouldFlagArgument(node) {
            const argument = services.esTreeNodeToTSNodeMap.get(node);
            const typeOfArgument = checker.getTypeAtLocation(argument);
            return isFlaggableHandlerType(typeOfArgument);
        }
        function shouldFlagMultipleSpreadArgs(argumentsList) {
            // One could try to be clever about unpacking fixed length tuples and stuff
            // like that, but there's no need, since this is all invalid use of `.catch`
            // anyway at the end of the day. Instead, we'll just check whether any of the
            // possible args types would violate the rule on its own.
            return argumentsList.some(argument => shouldFlagArgument(argument));
        }
        function shouldFlagSingleSpreadArg(node) {
            const spreadArgs = services.esTreeNodeToTSNodeMap.get(node.argument);
            const spreadArgsType = checker.getTypeAtLocation(spreadArgs);
            if (checker.isArrayType(spreadArgsType)) {
                const arrayType = checker.getTypeArguments(spreadArgsType)[0];
                return isFlaggableHandlerType(arrayType);
            }
            if (checker.isTupleType(spreadArgsType)) {
                const firstType = checker.getTypeArguments(spreadArgsType).at(0);
                if (!firstType) {
                    // empty spread args. Suspect code, but not a problem for this rule.
                    return false;
                }
                return isFlaggableHandlerType(firstType);
            }
            return true;
        }
        /**
         * Analyzes the syntax of the catch argument and makes a best effort to pinpoint
         * why it's reporting, and to come up with a suggested fix if possible.
         *
         * This function is explicitly operating under the assumption that the
         * rule _is reporting_, so it is not guaranteed to be sound to call otherwise.
         */
        function refineReportForNormalArgumentIfPossible(argument) {
            // Only know how to be helpful if a function literal has been provided.
            if (!(argument.type === utils_1.AST_NODE_TYPES.ArrowFunctionExpression ||
                argument.type === utils_1.AST_NODE_TYPES.FunctionExpression)) {
                return undefined;
            }
            const catchVariableOuterWithIncorrectTypes = (0, util_1.nullThrows)(argument.params.at(0), 'There should have been at least one parameter for the rule to have flagged.');
            // Function expressions can't have parameter properties; those only exist in constructors.
            const catchVariableOuter = catchVariableOuterWithIncorrectTypes;
            const catchVariableInner = catchVariableOuter.type === utils_1.AST_NODE_TYPES.AssignmentPattern
                ? catchVariableOuter.left
                : catchVariableOuter;
            switch (catchVariableInner.type) {
                case utils_1.AST_NODE_TYPES.Identifier: {
                    const catchVariableTypeAnnotation = catchVariableInner.typeAnnotation;
                    if (catchVariableTypeAnnotation == null) {
                        return {
                            node: catchVariableOuter,
                            suggest: [
                                {
                                    messageId: 'addUnknownTypeAnnotationSuggestion',
                                    fix: (fixer) => {
                                        if (argument.type ===
                                            utils_1.AST_NODE_TYPES.ArrowFunctionExpression &&
                                            (0, util_1.isParenlessArrowFunction)(argument, context.sourceCode)) {
                                            return [
                                                fixer.insertTextBefore(catchVariableInner, '('),
                                                fixer.insertTextAfter(catchVariableInner, ': unknown)'),
                                            ];
                                        }
                                        return [
                                            fixer.insertTextAfter(catchVariableInner, ': unknown'),
                                        ];
                                    },
                                },
                            ],
                        };
                    }
                    return {
                        node: catchVariableOuter,
                        suggest: [
                            {
                                messageId: 'wrongTypeAnnotationSuggestion',
                                fix: (fixer) => fixer.replaceText(catchVariableTypeAnnotation, ': unknown'),
                            },
                        ],
                    };
                }
                case utils_1.AST_NODE_TYPES.ArrayPattern: {
                    return {
                        node: catchVariableOuter,
                        messageId: 'useUnknownArrayDestructuringPattern',
                    };
                }
                case utils_1.AST_NODE_TYPES.ObjectPattern: {
                    return {
                        node: catchVariableOuter,
                        messageId: 'useUnknownObjectDestructuringPattern',
                    };
                }
                case utils_1.AST_NODE_TYPES.RestElement: {
                    const catchVariableTypeAnnotation = catchVariableInner.typeAnnotation;
                    if (catchVariableTypeAnnotation == null) {
                        return {
                            node: catchVariableOuter,
                            suggest: [
                                {
                                    messageId: 'addUnknownRestTypeAnnotationSuggestion',
                                    fix: (fixer) => fixer.insertTextAfter(catchVariableInner, ': [unknown]'),
                                },
                            ],
                        };
                    }
                    return {
                        node: catchVariableOuter,
                        suggest: [
                            {
                                messageId: 'wrongRestTypeAnnotationSuggestion',
                                fix: (fixer) => fixer.replaceText(catchVariableTypeAnnotation, ': [unknown]'),
                            },
                        ],
                    };
                }
            }
        }
        return {
            CallExpression(node) {
                if (node.arguments.length === 0 || !isPromiseCatchAccess(node.callee)) {
                    return;
                }
                const firstArgument = node.arguments[0];
                // Deal with some special cases around spread element args.
                // promise.catch(...handlers), promise.catch(...handlers, ...moreHandlers).
                if (firstArgument.type === utils_1.AST_NODE_TYPES.SpreadElement) {
                    if (node.arguments.length === 1) {
                        if (shouldFlagSingleSpreadArg(firstArgument)) {
                            context.report({
                                node: firstArgument,
                                messageId: 'useUnknown',
                            });
                        }
                    }
                    else if (shouldFlagMultipleSpreadArgs(node.arguments)) {
                        context.report({
                            node,
                            messageId: 'useUnknownSpreadArgs',
                        });
                    }
                    return;
                }
                // First argument is an "ordinary" argument (i.e. not a spread argument)
                // promise.catch(f), promise.catch(() => {}), promise.catch(<expression>, <<other-args>>)
                if (shouldFlagArgument(firstArgument)) {
                    // We are now guaranteed to report, but we have a bit of work to do
                    // to determine exactly where, and whether we can fix it.
                    const overrides = refineReportForNormalArgumentIfPossible(firstArgument);
                    context.report({
                        node: firstArgument,
                        messageId: 'useUnknown',
                        ...overrides,
                    });
                }
            },
        };
    },
});
/**
 * Answers whether the member expression looks like
 * `x.memberName`, `x['memberName']`,
 * or even `const mn = 'memberName'; x[mn]` (or optional variants thereof).
 */
function isStaticMemberAccessOfValue(memberExpression, value, scope) {
    if (!memberExpression.computed) {
        // x.memberName case.
        return memberExpression.property.name === value;
    }
    // x['memberName'] cases.
    const staticValueResult = (0, util_1.getStaticValue)(memberExpression.property, scope);
    return staticValueResult != null && value === staticValueResult.value;
}
//# sourceMappingURL=use-unknown-in-catch-callback-variable.js.map