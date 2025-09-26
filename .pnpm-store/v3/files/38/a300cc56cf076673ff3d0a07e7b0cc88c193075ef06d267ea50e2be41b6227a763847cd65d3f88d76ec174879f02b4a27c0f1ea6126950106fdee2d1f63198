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
exports.default = (0, util_1.createRule)({
    name: 'require-await',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow async functions which do not return promises and have no `await` expression',
            recommended: 'recommended',
            requiresTypeChecking: true,
            extendsBaseRule: true,
        },
        schema: [],
        messages: {
            missingAwait: "{{name}} has no 'await' expression.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        let scopeInfo = null;
        /**
         * Push the scope info object to the stack.
         */
        function enterFunction(node) {
            scopeInfo = {
                upper: scopeInfo,
                hasAwait: false,
                hasAsync: node.async,
                isGen: node.generator || false,
                isAsyncYield: false,
            };
        }
        /**
         * Pop the top scope info object from the stack.
         * Also, it reports the function if needed.
         */
        function exitFunction(node) {
            /* istanbul ignore if */ if (!scopeInfo) {
                // this shouldn't ever happen, as we have to exit a function after we enter it
                return;
            }
            if (node.async &&
                !scopeInfo.hasAwait &&
                !isEmptyFunction(node) &&
                !(scopeInfo.isGen && scopeInfo.isAsyncYield)) {
                context.report({
                    node,
                    loc: (0, util_1.getFunctionHeadLoc)(node, context.sourceCode),
                    messageId: 'missingAwait',
                    data: {
                        name: (0, util_1.upperCaseFirst)((0, util_1.getFunctionNameWithKind)(node)),
                    },
                });
            }
            scopeInfo = scopeInfo.upper;
        }
        /**
         * Checks if the node returns a thenable type
         */
        function isThenableType(node) {
            const type = checker.getTypeAtLocation(node);
            return tsutils.isThenableType(checker, node, type);
        }
        /**
         * Marks the current scope as having an await
         */
        function markAsHasAwait() {
            if (!scopeInfo) {
                return;
            }
            scopeInfo.hasAwait = true;
        }
        /**
         * Mark `scopeInfo.isAsyncYield` to `true` if it
         *  1) delegates async generator function
         *    or
         *  2) yields thenable type
         */
        function visitYieldExpression(node) {
            if (!scopeInfo?.isGen || !node.argument) {
                return;
            }
            if (node.argument.type === utils_1.AST_NODE_TYPES.Literal) {
                // ignoring this as for literals we don't need to check the definition
                // eg : async function* run() { yield* 1 }
                return;
            }
            if (!node.delegate) {
                if (isThenableType(services.esTreeNodeToTSNodeMap.get(node.argument))) {
                    scopeInfo.isAsyncYield = true;
                }
                return;
            }
            const type = services.getTypeAtLocation(node.argument);
            const typesToCheck = expandUnionOrIntersectionType(type);
            for (const type of typesToCheck) {
                const asyncIterator = tsutils.getWellKnownSymbolPropertyOfType(type, 'asyncIterator', checker);
                if (asyncIterator !== undefined) {
                    scopeInfo.isAsyncYield = true;
                    break;
                }
            }
        }
        return {
            FunctionDeclaration: enterFunction,
            FunctionExpression: enterFunction,
            ArrowFunctionExpression: enterFunction,
            'FunctionDeclaration:exit': exitFunction,
            'FunctionExpression:exit': exitFunction,
            'ArrowFunctionExpression:exit': exitFunction,
            AwaitExpression: markAsHasAwait,
            'VariableDeclaration[kind = "await using"]': markAsHasAwait,
            'ForOfStatement[await = true]': markAsHasAwait,
            YieldExpression: visitYieldExpression,
            // check body-less async arrow function.
            // ignore `async () => await foo` because it's obviously correct
            'ArrowFunctionExpression[async = true] > :not(BlockStatement, AwaitExpression)'(node) {
                const expression = services.esTreeNodeToTSNodeMap.get(node);
                if (isThenableType(expression)) {
                    markAsHasAwait();
                }
            },
            ReturnStatement(node) {
                // short circuit early to avoid unnecessary type checks
                if (!scopeInfo || scopeInfo.hasAwait || !scopeInfo.hasAsync) {
                    return;
                }
                const { expression } = services.esTreeNodeToTSNodeMap.get(node);
                if (expression && isThenableType(expression)) {
                    markAsHasAwait();
                }
            },
        };
    },
});
function isEmptyFunction(node) {
    return (node.body.type === utils_1.AST_NODE_TYPES.BlockStatement &&
        node.body.body.length === 0);
}
function expandUnionOrIntersectionType(type) {
    if (type.isUnionOrIntersection()) {
        return type.types.flatMap(expandUnionOrIntersectionType);
    }
    return [type];
}
//# sourceMappingURL=require-await.js.map