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
const astIgnoreKeys = new Set(['range', 'loc', 'parent']);
const isSameAstNode = (actualNode, expectedNode) => {
    if (actualNode === expectedNode) {
        return true;
    }
    if (actualNode &&
        expectedNode &&
        typeof actualNode === 'object' &&
        typeof expectedNode === 'object') {
        if (Array.isArray(actualNode) && Array.isArray(expectedNode)) {
            if (actualNode.length !== expectedNode.length) {
                return false;
            }
            return !actualNode.some((nodeEle, index) => !isSameAstNode(nodeEle, expectedNode[index]));
        }
        const actualNodeKeys = Object.keys(actualNode).filter(key => !astIgnoreKeys.has(key));
        const expectedNodeKeys = Object.keys(expectedNode).filter(key => !astIgnoreKeys.has(key));
        if (actualNodeKeys.length !== expectedNodeKeys.length) {
            return false;
        }
        if (actualNodeKeys.some(actualNodeKey => !Object.prototype.hasOwnProperty.call(expectedNode, actualNodeKey))) {
            return false;
        }
        if (actualNodeKeys.some(actualNodeKey => !isSameAstNode(actualNode[actualNodeKey], expectedNode[actualNodeKey]))) {
            return false;
        }
        return true;
    }
    return false;
};
exports.default = (0, util_1.createRule)({
    name: 'no-duplicate-type-constituents',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow duplicate constituents of union or intersection types',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        messages: {
            duplicate: '{{type}} type constituent is duplicated with {{previous}}.',
        },
        schema: [
            {
                additionalProperties: false,
                type: 'object',
                properties: {
                    ignoreIntersections: {
                        type: 'boolean',
                    },
                    ignoreUnions: {
                        type: 'boolean',
                    },
                },
            },
        ],
    },
    defaultOptions: [
        {
            ignoreIntersections: false,
            ignoreUnions: false,
        },
    ],
    create(context, [{ ignoreIntersections, ignoreUnions }]) {
        const parserServices = (0, util_1.getParserServices)(context);
        function checkDuplicate(node) {
            const cachedTypeMap = new Map();
            node.types.reduce((uniqueConstituents, constituentNode) => {
                const constituentNodeType = parserServices.getTypeAtLocation(constituentNode);
                if (tsutils.isIntrinsicErrorType(constituentNodeType)) {
                    return uniqueConstituents;
                }
                const duplicatedPreviousConstituentInAst = uniqueConstituents.find(ele => isSameAstNode(ele, constituentNode));
                if (duplicatedPreviousConstituentInAst) {
                    reportDuplicate({
                        duplicated: constituentNode,
                        duplicatePrevious: duplicatedPreviousConstituentInAst,
                    }, node);
                    return uniqueConstituents;
                }
                const duplicatedPreviousConstituentInType = cachedTypeMap.get(constituentNodeType);
                if (duplicatedPreviousConstituentInType) {
                    reportDuplicate({
                        duplicated: constituentNode,
                        duplicatePrevious: duplicatedPreviousConstituentInType,
                    }, node);
                    return uniqueConstituents;
                }
                cachedTypeMap.set(constituentNodeType, constituentNode);
                return [...uniqueConstituents, constituentNode];
            }, []);
        }
        function reportDuplicate(duplicateConstituent, parentNode) {
            const beforeTokens = context.sourceCode.getTokensBefore(duplicateConstituent.duplicated, { filter: token => token.value === '|' || token.value === '&' });
            const beforeUnionOrIntersectionToken = beforeTokens[beforeTokens.length - 1];
            const bracketBeforeTokens = context.sourceCode.getTokensBetween(beforeUnionOrIntersectionToken, duplicateConstituent.duplicated);
            const bracketAfterTokens = context.sourceCode.getTokensAfter(duplicateConstituent.duplicated, { count: bracketBeforeTokens.length });
            const reportLocation = {
                start: duplicateConstituent.duplicated.loc.start,
                end: bracketAfterTokens.length > 0
                    ? bracketAfterTokens[bracketAfterTokens.length - 1].loc.end
                    : duplicateConstituent.duplicated.loc.end,
            };
            context.report({
                data: {
                    type: parentNode.type === utils_1.AST_NODE_TYPES.TSIntersectionType
                        ? 'Intersection'
                        : 'Union',
                    previous: context.sourceCode.getText(duplicateConstituent.duplicatePrevious),
                },
                messageId: 'duplicate',
                node: duplicateConstituent.duplicated,
                loc: reportLocation,
                fix: fixer => {
                    return [
                        beforeUnionOrIntersectionToken,
                        ...bracketBeforeTokens,
                        duplicateConstituent.duplicated,
                        ...bracketAfterTokens,
                    ].map(token => fixer.remove(token));
                },
            });
        }
        return {
            ...(!ignoreIntersections && {
                TSIntersectionType: checkDuplicate,
            }),
            ...(!ignoreUnions && {
                TSUnionType: checkDuplicate,
            }),
        };
    },
});
//# sourceMappingURL=no-duplicate-type-constituents.js.map