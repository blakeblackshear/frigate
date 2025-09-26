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
const getOperatorPrecedence_1 = require("../util/getOperatorPrecedence");
exports.default = (0, util_1.createRule)({
    name: 'return-await',
    meta: {
        docs: {
            description: 'Enforce consistent awaiting of returned promises',
            requiresTypeChecking: true,
            extendsBaseRule: 'no-return-await',
        },
        fixable: 'code',
        hasSuggestions: true,
        type: 'problem',
        messages: {
            nonPromiseAwait: 'Returning an awaited value that is not a promise is not allowed.',
            disallowedPromiseAwait: 'Returning an awaited promise is not allowed in this context.',
            requiredPromiseAwait: 'Returning an awaited promise is required in this context.',
            requiredPromiseAwaitSuggestion: 'Add `await` before the expression. Use caution as this may impact control flow.',
            disallowedPromiseAwaitSuggestion: 'Remove `await` before the expression. Use caution as this may impact control flow.',
        },
        schema: [
            {
                type: 'string',
                enum: [
                    'in-try-catch',
                    'always',
                    'never',
                    'error-handling-correctness-only',
                ],
            },
        ],
    },
    defaultOptions: ['in-try-catch'],
    create(context, [option]) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        const scopeInfoStack = [];
        function enterFunction(node) {
            scopeInfoStack.push({
                hasAsync: node.async,
                owningFunc: node,
            });
        }
        function exitFunction() {
            scopeInfoStack.pop();
        }
        function affectsExplicitResourceManagement(node) {
            // just need to determine if there is a `using` declaration in scope.
            let scope = context.sourceCode.getScope(node);
            const functionScope = scope.variableScope;
            while (true) {
                for (const variable of scope.variables) {
                    if (variable.defs.length !== 1) {
                        // This can't be the case for `using` or `await using` since it's
                        // an error to redeclare those more than once in the same scope,
                        // unlike, say, `var` declarations.
                        continue;
                    }
                    const declaration = variable.defs[0];
                    const declaratorNode = declaration.node;
                    const declarationNode = declaratorNode.parent;
                    // if it's a using/await using declaration, and it comes _before_ the
                    // node we're checking, it affects control flow for that node.
                    if (['using', 'await using'].includes(declarationNode.kind) &&
                        declaratorNode.range[1] < node.range[0]) {
                        return true;
                    }
                }
                if (scope === functionScope) {
                    // We've checked all the relevant scopes
                    break;
                }
                // This should always exist, since the rule should only be checking
                // contexts in which `return` statements are legal, which should always
                // be inside a function.
                scope = (0, util_1.nullThrows)(scope.upper, 'Expected parent scope to exist. return-await should only operate on return statements within functions');
            }
            return false;
        }
        /**
         * Tests whether a node is inside of an explicit error handling context
         * (try/catch/finally) in a way that throwing an exception will have an
         * impact on the program's control flow.
         */
        function affectsExplicitErrorHandling(node) {
            // If an error-handling block is followed by another error-handling block,
            // control flow is affected by whether promises in it are awaited or not.
            // Otherwise, we need to check recursively for nested try statements until
            // we get to the top level of a function or the program. If by then,
            // there's no offending error-handling blocks, it doesn't affect control
            // flow.
            const tryAncestorResult = findContainingTryStatement(node);
            if (tryAncestorResult == null) {
                return false;
            }
            const { tryStatement, block } = tryAncestorResult;
            switch (block) {
                case 'try':
                    // Try blocks are always followed by either a catch or finally,
                    // so exceptions thrown here always affect control flow.
                    return true;
                case 'catch':
                    // Exceptions thrown in catch blocks followed by a finally block affect
                    // control flow.
                    if (tryStatement.finallyBlock != null) {
                        return true;
                    }
                    // Otherwise recurse.
                    return affectsExplicitErrorHandling(tryStatement);
                case 'finally':
                    return affectsExplicitErrorHandling(tryStatement);
                default: {
                    const __never = block;
                    throw new Error(`Unexpected block type: ${String(__never)}`);
                }
            }
        }
        /**
         * A try _statement_ is the whole thing that encompasses try block,
         * catch clause, and finally block. This function finds the nearest
         * enclosing try statement (if present) for a given node, and reports which
         * part of the try statement the node is in.
         */
        function findContainingTryStatement(node) {
            let child = node;
            let ancestor = node.parent;
            while (ancestor && !ts.isFunctionLike(ancestor)) {
                if (ts.isTryStatement(ancestor)) {
                    let block;
                    if (child === ancestor.tryBlock) {
                        block = 'try';
                    }
                    else if (child === ancestor.catchClause) {
                        block = 'catch';
                    }
                    else if (child === ancestor.finallyBlock) {
                        block = 'finally';
                    }
                    return {
                        tryStatement: ancestor,
                        block: (0, util_1.nullThrows)(block, 'Child of a try statement must be a try block, catch clause, or finally block'),
                    };
                }
                child = ancestor;
                ancestor = ancestor.parent;
            }
            return undefined;
        }
        function removeAwait(fixer, node) {
            // Should always be an await node; but let's be safe.
            /* istanbul ignore if */ if (!(0, util_1.isAwaitExpression)(node)) {
                return null;
            }
            const awaitToken = context.sourceCode.getFirstToken(node, util_1.isAwaitKeyword);
            // Should always be the case; but let's be safe.
            /* istanbul ignore if */ if (!awaitToken) {
                return null;
            }
            const startAt = awaitToken.range[0];
            let endAt = awaitToken.range[1];
            // Also remove any extraneous whitespace after `await`, if there is any.
            const nextToken = context.sourceCode.getTokenAfter(awaitToken, {
                includeComments: true,
            });
            if (nextToken) {
                endAt = nextToken.range[0];
            }
            return fixer.removeRange([startAt, endAt]);
        }
        function insertAwait(fixer, node, isHighPrecendence) {
            if (isHighPrecendence) {
                return fixer.insertTextBefore(node, 'await ');
            }
            return [
                fixer.insertTextBefore(node, 'await ('),
                fixer.insertTextAfter(node, ')'),
            ];
        }
        function isHigherPrecedenceThanAwait(node) {
            const operator = ts.isBinaryExpression(node)
                ? node.operatorToken.kind
                : ts.SyntaxKind.Unknown;
            const nodePrecedence = (0, getOperatorPrecedence_1.getOperatorPrecedence)(node.kind, operator);
            const awaitPrecedence = (0, getOperatorPrecedence_1.getOperatorPrecedence)(ts.SyntaxKind.AwaitExpression, ts.SyntaxKind.Unknown);
            return nodePrecedence > awaitPrecedence;
        }
        function test(node, expression) {
            let child;
            const isAwait = ts.isAwaitExpression(expression);
            if (isAwait) {
                child = expression.getChildAt(1);
            }
            else {
                child = expression;
            }
            const type = checker.getTypeAtLocation(child);
            const isThenable = tsutils.isThenableType(checker, expression, type);
            // handle awaited _non_thenables
            if (!isThenable) {
                if (isAwait) {
                    // any/unknown could be thenable; do not auto-fix
                    const useAutoFix = !((0, util_1.isTypeAnyType)(type) || (0, util_1.isTypeUnknownType)(type));
                    context.report({
                        messageId: 'nonPromiseAwait',
                        node,
                        ...fixOrSuggest(useAutoFix, {
                            messageId: 'nonPromiseAwait',
                            fix: fixer => removeAwait(fixer, node),
                        }),
                    });
                }
                return;
            }
            // At this point it's definitely a thenable.
            const affectsErrorHandling = affectsExplicitErrorHandling(expression) ||
                affectsExplicitResourceManagement(node);
            const useAutoFix = !affectsErrorHandling;
            const ruleConfiguration = getConfiguration(option);
            const shouldAwaitInCurrentContext = affectsErrorHandling
                ? ruleConfiguration.errorHandlingContext
                : ruleConfiguration.ordinaryContext;
            switch (shouldAwaitInCurrentContext) {
                case "don't-care":
                    break;
                case 'await':
                    if (!isAwait) {
                        context.report({
                            messageId: 'requiredPromiseAwait',
                            node,
                            ...fixOrSuggest(useAutoFix, {
                                messageId: 'requiredPromiseAwaitSuggestion',
                                fix: fixer => insertAwait(fixer, node, isHigherPrecedenceThanAwait(expression)),
                            }),
                        });
                    }
                    break;
                case 'no-await':
                    if (isAwait) {
                        context.report({
                            messageId: 'disallowedPromiseAwait',
                            node,
                            ...fixOrSuggest(useAutoFix, {
                                messageId: 'disallowedPromiseAwaitSuggestion',
                                fix: fixer => removeAwait(fixer, node),
                            }),
                        });
                    }
                    break;
            }
        }
        function findPossiblyReturnedNodes(node) {
            if (node.type === utils_1.AST_NODE_TYPES.ConditionalExpression) {
                return [
                    ...findPossiblyReturnedNodes(node.alternate),
                    ...findPossiblyReturnedNodes(node.consequent),
                ];
            }
            return [node];
        }
        return {
            FunctionDeclaration: enterFunction,
            FunctionExpression: enterFunction,
            ArrowFunctionExpression: enterFunction,
            'FunctionDeclaration:exit': exitFunction,
            'FunctionExpression:exit': exitFunction,
            'ArrowFunctionExpression:exit': exitFunction,
            // executes after less specific handler, so exitFunction is called
            'ArrowFunctionExpression[async = true]:exit'(node) {
                if (node.body.type !== utils_1.AST_NODE_TYPES.BlockStatement) {
                    findPossiblyReturnedNodes(node.body).forEach(node => {
                        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                        test(node, tsNode);
                    });
                }
            },
            ReturnStatement(node) {
                const scopeInfo = scopeInfoStack.at(-1);
                if (!scopeInfo?.hasAsync || !node.argument) {
                    return;
                }
                findPossiblyReturnedNodes(node.argument).forEach(node => {
                    const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                    test(node, tsNode);
                });
            },
        };
    },
});
function getConfiguration(option) {
    switch (option) {
        case 'always':
            return {
                ordinaryContext: 'await',
                errorHandlingContext: 'await',
            };
        case 'never':
            return {
                ordinaryContext: 'no-await',
                errorHandlingContext: 'no-await',
            };
        case 'error-handling-correctness-only':
            return {
                ordinaryContext: "don't-care",
                errorHandlingContext: 'await',
            };
        case 'in-try-catch':
            return {
                ordinaryContext: 'no-await',
                errorHandlingContext: 'await',
            };
    }
}
function fixOrSuggest(useFix, suggestion) {
    return useFix ? { fix: suggestion.fix } : { suggest: [suggestion] };
}
//# sourceMappingURL=return-await.js.map