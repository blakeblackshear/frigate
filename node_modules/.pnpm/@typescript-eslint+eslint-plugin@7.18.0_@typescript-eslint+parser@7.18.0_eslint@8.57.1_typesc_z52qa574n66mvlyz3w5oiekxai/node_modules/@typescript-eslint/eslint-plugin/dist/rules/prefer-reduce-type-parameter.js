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
const getMemberExpressionName = (member) => {
    if (!member.computed) {
        return member.property.name;
    }
    if (member.property.type === utils_1.AST_NODE_TYPES.Literal &&
        typeof member.property.value === 'string') {
        return member.property.value;
    }
    return null;
};
exports.default = (0, util_1.createRule)({
    name: 'prefer-reduce-type-parameter',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce using type parameter when calling `Array#reduce` instead of casting',
            recommended: 'strict',
            requiresTypeChecking: true,
        },
        messages: {
            preferTypeParameter: 'Unnecessary cast: Array#reduce accepts a type parameter for the default value.',
        },
        fixable: 'code',
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        function isArrayType(type) {
            return tsutils
                .unionTypeParts(type)
                .every(unionPart => tsutils
                .intersectionTypeParts(unionPart)
                .every(t => checker.isArrayType(t) || checker.isTupleType(t)));
        }
        return {
            'CallExpression > MemberExpression.callee'(callee) {
                if (getMemberExpressionName(callee) !== 'reduce') {
                    return;
                }
                const [, secondArg] = callee.parent.arguments;
                if (callee.parent.arguments.length < 2 || !(0, util_1.isTypeAssertion)(secondArg)) {
                    return;
                }
                // Get the symbol of the `reduce` method.
                const calleeObjType = (0, util_1.getConstrainedTypeAtLocation)(services, callee.object);
                // Check the owner type of the `reduce` method.
                if (isArrayType(calleeObjType)) {
                    context.report({
                        messageId: 'preferTypeParameter',
                        node: secondArg,
                        fix: fixer => {
                            const fixes = [
                                fixer.removeRange([
                                    secondArg.range[0],
                                    secondArg.expression.range[0],
                                ]),
                                fixer.removeRange([
                                    secondArg.expression.range[1],
                                    secondArg.range[1],
                                ]),
                            ];
                            if (!callee.parent.typeArguments) {
                                fixes.push(fixer.insertTextAfter(callee, `<${context.sourceCode.getText(secondArg.typeAnnotation)}>`));
                            }
                            return fixes;
                        },
                    });
                    return;
                }
            },
        };
    },
});
//# sourceMappingURL=prefer-reduce-type-parameter.js.map