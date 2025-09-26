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
    defaultOptions: [],
    meta: {
        docs: {
            description: 'Disallow type parameters that only appear once',
            requiresTypeChecking: true,
        },
        messages: {
            sole: 'Type parameter {{name}} is used only once.',
        },
        schema: [],
        type: 'problem',
    },
    name: 'no-unnecessary-type-parameters',
    create(context) {
        const parserServices = (0, util_1.getParserServices)(context);
        return {
            [[
                'ArrowFunctionExpression[typeParameters]',
                'ClassDeclaration[typeParameters]',
                'ClassExpression[typeParameters]',
                'FunctionDeclaration[typeParameters]',
                'FunctionExpression[typeParameters]',
                'TSCallSignatureDeclaration[typeParameters]',
                'TSConstructorType[typeParameters]',
                'TSDeclareFunction[typeParameters]',
                'TSEmptyBodyFunctionExpression[typeParameters]',
                'TSFunctionType[typeParameters]',
                'TSMethodSignature[typeParameters]',
            ].join(', ')](node) {
                const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
                const checker = parserServices.program.getTypeChecker();
                let counts;
                for (const typeParameter of tsNode.typeParameters) {
                    const esTypeParameter = parserServices.tsNodeToESTreeNodeMap.get(typeParameter);
                    const scope = context.sourceCode.getScope(esTypeParameter);
                    // Quick path: if the type parameter is used multiple times in the AST,
                    // we don't need to dip into types to know it's repeated.
                    if (isTypeParameterRepeatedInAST(esTypeParameter, scope.references)) {
                        continue;
                    }
                    // For any inferred types, we have to dip into type checking.
                    counts ??= countTypeParameterUsage(checker, tsNode);
                    const identifierCounts = counts.get(typeParameter.name);
                    if (!identifierCounts || identifierCounts > 2) {
                        continue;
                    }
                    context.report({
                        data: {
                            name: typeParameter.name.text,
                        },
                        node: esTypeParameter,
                        messageId: 'sole',
                    });
                }
            },
        };
    },
});
function isTypeParameterRepeatedInAST(node, references) {
    let total = 0;
    for (const reference of references) {
        // References inside the type parameter's definition don't count.
        if (reference.identifier.range[0] < node.range[1] &&
            reference.identifier.range[1] > node.range[0]) {
            continue;
        }
        // Neither do references that aren't to the same type parameter,
        // namely value-land (non-type) identifiers of the type parameter's type,
        // and references to different type parameters or values.
        if (!reference.isTypeReference ||
            reference.identifier.name !== node.name.name) {
            continue;
        }
        // If the type parameter is being used as a type argument, then we
        // know the type parameter is being reused and can't be reported.
        if (reference.identifier.parent.type === utils_1.AST_NODE_TYPES.TSTypeReference) {
            const grandparent = skipConstituentsUpward(reference.identifier.parent.parent);
            if (grandparent.type === utils_1.AST_NODE_TYPES.TSTypeParameterInstantiation &&
                grandparent.params.includes(reference.identifier.parent)) {
                return true;
            }
        }
        total += 1;
        if (total > 2) {
            return true;
        }
    }
    return false;
}
function skipConstituentsUpward(node) {
    switch (node.type) {
        case utils_1.AST_NODE_TYPES.TSIntersectionType:
        case utils_1.AST_NODE_TYPES.TSUnionType:
            return skipConstituentsUpward(node.parent);
        default:
            return node;
    }
}
/**
 * Count uses of type parameters in inferred return types.
 * We need to resolve and analyze the inferred return type of a function
 * to see whether it contains additional references to the type parameters.
 * For classes, we need to do this for all their methods.
 */
function countTypeParameterUsage(checker, node) {
    const counts = new Map();
    if (ts.isClassLike(node)) {
        for (const typeParameter of node.typeParameters) {
            collectTypeParameterUsageCounts(checker, typeParameter, counts);
        }
        for (const member of node.members) {
            collectTypeParameterUsageCounts(checker, member, counts);
        }
    }
    else {
        collectTypeParameterUsageCounts(checker, node, counts);
    }
    return counts;
}
/**
 * Populates {@link foundIdentifierUsages} by the number of times each type parameter
 * appears in the given type by checking its uses through its type references.
 * This is essentially a limited subset of the scope manager, but for types.
 */
function collectTypeParameterUsageCounts(checker, node, foundIdentifierUsages) {
    const visitedSymbolLists = new Set();
    const type = checker.getTypeAtLocation(node);
    const typeUsages = new Map();
    const visitedConstraints = new Set();
    let functionLikeType = false;
    let visitedDefault = false;
    if (ts.isCallSignatureDeclaration(node) ||
        ts.isConstructorDeclaration(node)) {
        functionLikeType = true;
        visitSignature(checker.getSignatureFromDeclaration(node));
    }
    if (!functionLikeType) {
        visitType(type, false);
    }
    function visitType(type, assumeMultipleUses) {
        // Seeing the same type > (threshold=3 ** 2) times indicates a likely
        // recursive type, like `type T = { [P in keyof T]: T }`.
        // If it's not recursive, then heck, we've seen it enough times that any
        // referenced types have been counted enough to qualify as used.
        if (!type || incrementTypeUsages(type) > 9) {
            return;
        }
        // https://github.com/JoshuaKGoldberg/ts-api-utils/issues/382
        if (tsutils.isTypeParameter(type)) {
            const declaration = type.getSymbol()?.getDeclarations()?.[0];
            if (declaration) {
                incrementIdentifierCount(declaration.name, assumeMultipleUses);
                // Visiting the type of a constrained type parameter will recurse into
                // the constraint. We avoid infinite loops by visiting each only once.
                if (declaration.constraint &&
                    !visitedConstraints.has(declaration.constraint)) {
                    visitedConstraints.add(declaration.constraint);
                    visitType(checker.getTypeAtLocation(declaration.constraint), false);
                }
                if (declaration.default && !visitedDefault) {
                    visitedDefault = true;
                    visitType(checker.getTypeAtLocation(declaration.default), false);
                }
            }
        }
        // Intersections and unions like `0 | 1`
        else if (tsutils.isUnionOrIntersectionType(type)) {
            visitTypesList(type.types, assumeMultipleUses);
        }
        // Index access types like `T[K]`
        else if (tsutils.isIndexedAccessType(type)) {
            visitType(type.objectType, assumeMultipleUses);
            visitType(type.indexType, assumeMultipleUses);
        }
        // Tuple types like `[K, V]`
        // Generic type references like `Map<K, V>`
        else if (tsutils.isTupleType(type) || tsutils.isTypeReference(type)) {
            for (const typeArgument of type.typeArguments ?? []) {
                visitType(typeArgument, true);
            }
        }
        // Template literals like `a${T}b`
        else if (tsutils.isTemplateLiteralType(type)) {
            for (const subType of type.types) {
                visitType(subType, assumeMultipleUses);
            }
        }
        // Conditional types like `T extends string ? T : never`
        else if (tsutils.isConditionalType(type)) {
            visitType(type.checkType, assumeMultipleUses);
            visitType(type.extendsType, assumeMultipleUses);
        }
        // Catch-all: inferred object types like `{ K: V }`.
        // These catch-alls should be _after_ more specific checks like
        // `isTypeReference` to avoid descending into all the properties of a
        // generic interface/class, e.g. `Map<K, V>`.
        else if (tsutils.isObjectType(type)) {
            const properties = type.getProperties();
            visitSymbolsListOnce(properties, false);
            if (isMappedType(type)) {
                visitType(type.typeParameter, false);
                if (properties.length === 0) {
                    // TS treats mapped types like `{[k in "a"]: T}` like `{a: T}`.
                    // They have properties, so we need to avoid double-counting.
                    visitType(type.templateType, false);
                }
            }
            for (const typeArgument of type.aliasTypeArguments ?? []) {
                visitType(typeArgument, true);
            }
            visitType(type.getNumberIndexType(), true);
            visitType(type.getStringIndexType(), true);
            type.getCallSignatures().forEach(signature => {
                functionLikeType = true;
                visitSignature(signature);
            });
            type.getConstructSignatures().forEach(signature => {
                functionLikeType = true;
                visitSignature(signature);
            });
        }
        // Catch-all: operator types like `keyof T`
        else if (isOperatorType(type)) {
            visitType(type.type, assumeMultipleUses);
        }
        // Catch-all: generic type references like `Exclude<T, null>`
        else if (type.aliasTypeArguments) {
            visitTypesList(type.aliasTypeArguments, true);
        }
    }
    function incrementIdentifierCount(id, assumeMultipleUses) {
        const identifierCount = foundIdentifierUsages.get(id) ?? 0;
        const value = assumeMultipleUses ? 2 : 1;
        foundIdentifierUsages.set(id, identifierCount + value);
    }
    function incrementTypeUsages(type) {
        const count = (typeUsages.get(type) ?? 0) + 1;
        typeUsages.set(type, count);
        return count;
    }
    function visitSignature(signature) {
        if (!signature) {
            return;
        }
        if (signature.thisParameter) {
            visitType(checker.getTypeOfSymbol(signature.thisParameter), false);
        }
        for (const parameter of signature.parameters) {
            visitType(checker.getTypeOfSymbol(parameter), false);
        }
        for (const typeParameter of signature.getTypeParameters() ?? []) {
            visitType(typeParameter, false);
        }
        visitType(checker.getTypePredicateOfSignature(signature)?.type ??
            signature.getReturnType(), false);
    }
    function visitSymbolsListOnce(symbols, assumeMultipleUses) {
        if (visitedSymbolLists.has(symbols)) {
            return;
        }
        visitedSymbolLists.add(symbols);
        for (const symbol of symbols) {
            visitType(checker.getTypeOfSymbol(symbol), assumeMultipleUses);
        }
    }
    function visitTypesList(types, assumeMultipleUses) {
        for (const type of types) {
            visitType(type, assumeMultipleUses);
        }
    }
}
function isMappedType(type) {
    return 'typeParameter' in type;
}
function isOperatorType(type) {
    return 'type' in type && !!type.type;
}
//# sourceMappingURL=no-unnecessary-type-parameters.js.map