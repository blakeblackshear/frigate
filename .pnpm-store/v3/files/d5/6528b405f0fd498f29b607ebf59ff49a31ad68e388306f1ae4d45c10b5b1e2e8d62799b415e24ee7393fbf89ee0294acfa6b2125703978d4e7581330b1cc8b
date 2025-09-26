/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { assertUnreachable } from '../utils/errors.js';
import * as ast from '../languages/generated/ast.js';
import { isCompositeCstNode } from '../syntax-tree.js';
import { getContainerOfType, streamAllContents } from './ast-utils.js';
import { streamCst } from './cst-utils.js';
import { escapeRegExp, isWhitespace } from './regexp-utils.js';
/**
 * Returns the entry rule of the given grammar, if any. If the grammar file does not contain an entry rule,
 * the result is `undefined`.
 */
export function getEntryRule(grammar) {
    return grammar.rules.find(e => ast.isParserRule(e) && e.entry);
}
/**
 * Returns all hidden terminal rules of the given grammar, if any.
 */
export function getHiddenRules(grammar) {
    return grammar.rules.filter((e) => ast.isTerminalRule(e) && e.hidden);
}
/**
 * Returns all rules that can be reached from the topmost rules of the specified grammar (entry and hidden terminal rules).
 *
 * @param grammar The grammar that contains all rules
 * @param allTerminals Whether or not to include terminals that are referenced only by other terminals
 * @returns A list of referenced parser and terminal rules. If the grammar contains no entry rule,
 *      this function returns all rules of the specified grammar.
 */
export function getAllReachableRules(grammar, allTerminals) {
    const ruleNames = new Set();
    const entryRule = getEntryRule(grammar);
    if (!entryRule) {
        return new Set(grammar.rules);
    }
    const topMostRules = [entryRule].concat(getHiddenRules(grammar));
    for (const rule of topMostRules) {
        ruleDfs(rule, ruleNames, allTerminals);
    }
    const rules = new Set();
    for (const rule of grammar.rules) {
        if (ruleNames.has(rule.name) || (ast.isTerminalRule(rule) && rule.hidden)) {
            rules.add(rule);
        }
    }
    return rules;
}
function ruleDfs(rule, visitedSet, allTerminals) {
    visitedSet.add(rule.name);
    streamAllContents(rule).forEach(node => {
        if (ast.isRuleCall(node) || (allTerminals && ast.isTerminalRuleCall(node))) {
            const refRule = node.rule.ref;
            if (refRule && !visitedSet.has(refRule.name)) {
                ruleDfs(refRule, visitedSet, allTerminals);
            }
        }
    });
}
/**
 * Determines the grammar expression used to parse a cross-reference (usually a reference to a terminal rule).
 * A cross-reference can declare this expression explicitly in the form `[Type : Terminal]`, but if `Terminal`
 * is omitted, this function attempts to infer it from the name of the referenced `Type` (using `findNameAssignment`).
 *
 * Returns the grammar expression used to parse the given cross-reference, or `undefined` if it is not declared
 * and cannot be inferred.
 */
export function getCrossReferenceTerminal(crossRef) {
    if (crossRef.terminal) {
        return crossRef.terminal;
    }
    else if (crossRef.type.ref) {
        const nameAssigment = findNameAssignment(crossRef.type.ref);
        return nameAssigment === null || nameAssigment === void 0 ? void 0 : nameAssigment.terminal;
    }
    return undefined;
}
/**
 * Determines whether the given terminal rule represents a comment. This is true if the rule is marked
 * as `hidden` and it does not match white space. This means every hidden token (i.e. excluded from the AST)
 * that contains visible characters is considered a comment.
 */
export function isCommentTerminal(terminalRule) {
    return terminalRule.hidden && !isWhitespace(terminalRegex(terminalRule));
}
/**
 * Find all CST nodes within the given node that contribute to the specified property.
 *
 * @param node A CST node in which to look for property assignments. If this is undefined, the result is an empty array.
 * @param property A property name of the constructed AST node. If this is undefined, the result is an empty array.
 */
export function findNodesForProperty(node, property) {
    if (!node || !property) {
        return [];
    }
    return findNodesForPropertyInternal(node, property, node.astNode, true);
}
/**
 * Find a single CST node within the given node that contributes to the specified property.
 *
 * @param node A CST node in which to look for property assignments. If this is undefined, the result is `undefined`.
 * @param property A property name of the constructed AST node. If this is undefined, the result is `undefined`.
 * @param index If no index is specified or the index is less than zero, the first found node is returned. If the
 *        specified index exceeds the number of assignments to the property, the last found node is returned. Otherwise,
 *        the node with the specified index is returned.
 */
export function findNodeForProperty(node, property, index) {
    if (!node || !property) {
        return undefined;
    }
    const nodes = findNodesForPropertyInternal(node, property, node.astNode, true);
    if (nodes.length === 0) {
        return undefined;
    }
    if (index !== undefined) {
        index = Math.max(0, Math.min(index, nodes.length - 1));
    }
    else {
        index = 0;
    }
    return nodes[index];
}
function findNodesForPropertyInternal(node, property, element, first) {
    if (!first) {
        const nodeFeature = getContainerOfType(node.grammarSource, ast.isAssignment);
        if (nodeFeature && nodeFeature.feature === property) {
            return [node];
        }
    }
    if (isCompositeCstNode(node) && node.astNode === element) {
        return node.content.flatMap(e => findNodesForPropertyInternal(e, property, element, false));
    }
    return [];
}
/**
 * Find all CST nodes within the given node that correspond to the specified keyword.
 *
 * @param node A CST node in which to look for keywords. If this is undefined, the result is an empty array.
 * @param keyword A keyword as specified in the grammar.
 */
export function findNodesForKeyword(node, keyword) {
    if (!node) {
        return [];
    }
    return findNodesForKeywordInternal(node, keyword, node === null || node === void 0 ? void 0 : node.astNode);
}
/**
 * Find a single CST node within the given node that corresponds to the specified keyword.
 *
 * @param node A CST node in which to look for keywords. If this is undefined, the result is `undefined`.
 * @param keyword A keyword as specified in the grammar.
 * @param index If no index is specified or the index is less than zero, the first found node is returned. If the
 *        specified index exceeds the number of keyword occurrences, the last found node is returned. Otherwise,
 *        the node with the specified index is returned.
 */
export function findNodeForKeyword(node, keyword, index) {
    if (!node) {
        return undefined;
    }
    const nodes = findNodesForKeywordInternal(node, keyword, node === null || node === void 0 ? void 0 : node.astNode);
    if (nodes.length === 0) {
        return undefined;
    }
    if (index !== undefined) {
        index = Math.max(0, Math.min(index, nodes.length - 1));
    }
    else {
        index = 0;
    }
    return nodes[index];
}
export function findNodesForKeywordInternal(node, keyword, element) {
    if (node.astNode !== element) {
        return [];
    }
    if (ast.isKeyword(node.grammarSource) && node.grammarSource.value === keyword) {
        return [node];
    }
    const treeIterator = streamCst(node).iterator();
    let result;
    const keywordNodes = [];
    do {
        result = treeIterator.next();
        if (!result.done) {
            const childNode = result.value;
            if (childNode.astNode === element) {
                if (ast.isKeyword(childNode.grammarSource) && childNode.grammarSource.value === keyword) {
                    keywordNodes.push(childNode);
                }
            }
            else {
                treeIterator.prune();
            }
        }
    } while (!result.done);
    return keywordNodes;
}
/**
 * If the given CST node was parsed in the context of a property assignment, the respective `Assignment` grammar
 * node is returned. If no assignment is found, the result is `undefined`.
 *
 * @param cstNode A CST node for which to find a property assignment.
 */
export function findAssignment(cstNode) {
    var _a;
    const astNode = cstNode.astNode;
    // Only search until the ast node of the parent cst node is no longer the original ast node
    // This would make us jump to a preceding rule call, which contains only unrelated assignments
    while (astNode === ((_a = cstNode.container) === null || _a === void 0 ? void 0 : _a.astNode)) {
        const assignment = getContainerOfType(cstNode.grammarSource, ast.isAssignment);
        if (assignment) {
            return assignment;
        }
        cstNode = cstNode.container;
    }
    return undefined;
}
/**
 * Find an assignment to the `name` property for the given grammar type. This requires the `type` to be inferred
 * from a parser rule, and that rule must contain an assignment to the `name` property. In all other cases,
 * this function returns `undefined`.
 */
export function findNameAssignment(type) {
    let startNode = type;
    if (ast.isInferredType(startNode)) {
        // for inferred types, the location to start searching for the name-assignment is different
        if (ast.isAction(startNode.$container)) {
            // a type which is explicitly inferred by an action: investigate the sibbling of the Action node, i.e. start searching at the Action's parent
            startNode = startNode.$container.$container;
        }
        else if (ast.isParserRule(startNode.$container)) {
            // investigate the parser rule with the explicitly inferred type
            startNode = startNode.$container;
        }
        else {
            assertUnreachable(startNode.$container);
        }
    }
    return findNameAssignmentInternal(type, startNode, new Map());
}
function findNameAssignmentInternal(type, startNode, cache) {
    var _a;
    // the cache is only required to prevent infinite loops
    function go(node, refType) {
        let childAssignment = undefined;
        const parentAssignment = getContainerOfType(node, ast.isAssignment);
        // No parent assignment implies unassigned rule call
        if (!parentAssignment) {
            childAssignment = findNameAssignmentInternal(refType, refType, cache);
        }
        cache.set(type, childAssignment);
        return childAssignment;
    }
    if (cache.has(type)) {
        return cache.get(type);
    }
    cache.set(type, undefined);
    for (const node of streamAllContents(startNode)) {
        if (ast.isAssignment(node) && node.feature.toLowerCase() === 'name') {
            cache.set(type, node);
            return node;
        }
        else if (ast.isRuleCall(node) && ast.isParserRule(node.rule.ref)) {
            return go(node, node.rule.ref);
        }
        else if (ast.isSimpleType(node) && ((_a = node.typeRef) === null || _a === void 0 ? void 0 : _a.ref)) {
            return go(node, node.typeRef.ref);
        }
    }
    return undefined;
}
export function getActionAtElement(element) {
    const parent = element.$container;
    if (ast.isGroup(parent)) {
        const elements = parent.elements;
        const index = elements.indexOf(element);
        for (let i = index - 1; i >= 0; i--) {
            const item = elements[i];
            if (ast.isAction(item)) {
                return item;
            }
            else {
                const action = streamAllContents(elements[i]).find(ast.isAction);
                if (action) {
                    return action;
                }
            }
        }
    }
    if (ast.isAbstractElement(parent)) {
        return getActionAtElement(parent);
    }
    else {
        return undefined;
    }
}
export function isOptionalCardinality(cardinality, element) {
    return cardinality === '?' || cardinality === '*' || (ast.isGroup(element) && Boolean(element.guardCondition));
}
export function isArrayCardinality(cardinality) {
    return cardinality === '*' || cardinality === '+';
}
export function isArrayOperator(operator) {
    return operator === '+=';
}
/**
 * Determines whether the given parser rule is a _data type rule_, meaning that it has a
 * primitive return type like `number`, `boolean`, etc.
 */
export function isDataTypeRule(rule) {
    return isDataTypeRuleInternal(rule, new Set());
}
function isDataTypeRuleInternal(rule, visited) {
    if (visited.has(rule)) {
        return true;
    }
    else {
        visited.add(rule);
    }
    for (const node of streamAllContents(rule)) {
        if (ast.isRuleCall(node)) {
            if (!node.rule.ref) {
                // RuleCall to unresolved rule. Don't assume `rule` is a DataType rule.
                return false;
            }
            if (ast.isParserRule(node.rule.ref) && !isDataTypeRuleInternal(node.rule.ref, visited)) {
                return false;
            }
        }
        else if (ast.isAssignment(node)) {
            return false;
        }
        else if (ast.isAction(node)) {
            return false;
        }
    }
    return Boolean(rule.definition);
}
export function isDataType(type) {
    return isDataTypeInternal(type.type, new Set());
}
function isDataTypeInternal(type, visited) {
    if (visited.has(type)) {
        return true;
    }
    else {
        visited.add(type);
    }
    if (ast.isArrayType(type)) {
        return false;
    }
    else if (ast.isReferenceType(type)) {
        return false;
    }
    else if (ast.isUnionType(type)) {
        return type.types.every(e => isDataTypeInternal(e, visited));
    }
    else if (ast.isSimpleType(type)) {
        if (type.primitiveType !== undefined) {
            return true;
        }
        else if (type.stringType !== undefined) {
            return true;
        }
        else if (type.typeRef !== undefined) {
            const ref = type.typeRef.ref;
            if (ast.isType(ref)) {
                return isDataTypeInternal(ref.type, visited);
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}
export function getExplicitRuleType(rule) {
    if (rule.inferredType) {
        return rule.inferredType.name;
    }
    else if (rule.dataType) {
        return rule.dataType;
    }
    else if (rule.returnType) {
        const refType = rule.returnType.ref;
        if (refType) {
            // check if we need to check Action as return type
            if (ast.isParserRule(refType)) {
                return refType.name;
            }
            else if (ast.isInterface(refType) || ast.isType(refType)) {
                return refType.name;
            }
        }
    }
    return undefined;
}
export function getTypeName(type) {
    var _a;
    if (ast.isParserRule(type)) {
        return isDataTypeRule(type) ? type.name : (_a = getExplicitRuleType(type)) !== null && _a !== void 0 ? _a : type.name;
    }
    else if (ast.isInterface(type) || ast.isType(type) || ast.isReturnType(type)) {
        return type.name;
    }
    else if (ast.isAction(type)) {
        const actionType = getActionType(type);
        if (actionType) {
            return actionType;
        }
    }
    else if (ast.isInferredType(type)) {
        return type.name;
    }
    throw new Error('Cannot get name of Unknown Type');
}
export function getActionType(action) {
    var _a;
    if (action.inferredType) {
        return action.inferredType.name;
    }
    else if ((_a = action.type) === null || _a === void 0 ? void 0 : _a.ref) {
        return getTypeName(action.type.ref);
    }
    return undefined; // not inferring and not referencing a valid type
}
/**
 * This function is used at development time (for code generation and the internal type system) to get the type of the AST node produced by the given rule.
 * For data type rules, the name of the rule is returned,
 * e.g. "INT_value returns number: MY_INT;" returns "INT_value".
 * @param rule the given rule
 * @returns the name of the AST node type of the rule
 */
export function getRuleTypeName(rule) {
    var _a, _b, _c;
    if (ast.isTerminalRule(rule)) {
        return (_b = (_a = rule.type) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'string';
    }
    else {
        return isDataTypeRule(rule) ? rule.name : (_c = getExplicitRuleType(rule)) !== null && _c !== void 0 ? _c : rule.name;
    }
}
/**
 * This function is used at runtime to get the actual type of the values produced by the given rule at runtime.
 * For data type rules, the name of the declared return type of the rule is returned (if any),
 * e.g. "INT_value returns number: MY_INT;" returns "number".
 * @param rule the given rule
 * @returns the name of the type of the produced values of the rule at runtime
 */
export function getRuleType(rule) {
    var _a, _b, _c;
    if (ast.isTerminalRule(rule)) {
        return (_b = (_a = rule.type) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'string';
    }
    else {
        return (_c = getExplicitRuleType(rule)) !== null && _c !== void 0 ? _c : rule.name;
    }
}
export function terminalRegex(terminalRule) {
    const flags = {
        s: false,
        i: false,
        u: false
    };
    const source = abstractElementToRegex(terminalRule.definition, flags);
    const flagText = Object.entries(flags).filter(([, value]) => value).map(([name]) => name).join('');
    return new RegExp(source, flagText);
}
// Using [\s\S]* allows to match everything, compared to . which doesn't match line terminators
const WILDCARD = /[\s\S]/.source;
function abstractElementToRegex(element, flags) {
    if (ast.isTerminalAlternatives(element)) {
        return terminalAlternativesToRegex(element);
    }
    else if (ast.isTerminalGroup(element)) {
        return terminalGroupToRegex(element);
    }
    else if (ast.isCharacterRange(element)) {
        return characterRangeToRegex(element);
    }
    else if (ast.isTerminalRuleCall(element)) {
        const rule = element.rule.ref;
        if (!rule) {
            throw new Error('Missing rule reference.');
        }
        return withCardinality(abstractElementToRegex(rule.definition), {
            cardinality: element.cardinality,
            lookahead: element.lookahead
        });
    }
    else if (ast.isNegatedToken(element)) {
        return negateTokenToRegex(element);
    }
    else if (ast.isUntilToken(element)) {
        return untilTokenToRegex(element);
    }
    else if (ast.isRegexToken(element)) {
        const lastSlash = element.regex.lastIndexOf('/');
        const source = element.regex.substring(1, lastSlash);
        const regexFlags = element.regex.substring(lastSlash + 1);
        if (flags) {
            flags.i = regexFlags.includes('i');
            flags.s = regexFlags.includes('s');
            flags.u = regexFlags.includes('u');
        }
        return withCardinality(source, {
            cardinality: element.cardinality,
            lookahead: element.lookahead,
            wrap: false
        });
    }
    else if (ast.isWildcard(element)) {
        return withCardinality(WILDCARD, {
            cardinality: element.cardinality,
            lookahead: element.lookahead
        });
    }
    else {
        throw new Error(`Invalid terminal element: ${element === null || element === void 0 ? void 0 : element.$type}`);
    }
}
function terminalAlternativesToRegex(alternatives) {
    return withCardinality(alternatives.elements.map(e => abstractElementToRegex(e)).join('|'), {
        cardinality: alternatives.cardinality,
        lookahead: alternatives.lookahead
    });
}
function terminalGroupToRegex(group) {
    return withCardinality(group.elements.map(e => abstractElementToRegex(e)).join(''), {
        cardinality: group.cardinality,
        lookahead: group.lookahead
    });
}
function untilTokenToRegex(until) {
    return withCardinality(`${WILDCARD}*?${abstractElementToRegex(until.terminal)}`, {
        cardinality: until.cardinality,
        lookahead: until.lookahead
    });
}
function negateTokenToRegex(negate) {
    return withCardinality(`(?!${abstractElementToRegex(negate.terminal)})${WILDCARD}*?`, {
        cardinality: negate.cardinality,
        lookahead: negate.lookahead
    });
}
function characterRangeToRegex(range) {
    if (range.right) {
        return withCardinality(`[${keywordToRegex(range.left)}-${keywordToRegex(range.right)}]`, {
            cardinality: range.cardinality,
            lookahead: range.lookahead,
            wrap: false
        });
    }
    return withCardinality(keywordToRegex(range.left), {
        cardinality: range.cardinality,
        lookahead: range.lookahead,
        wrap: false
    });
}
function keywordToRegex(keyword) {
    return escapeRegExp(keyword.value);
}
function withCardinality(regex, options) {
    var _a;
    if (options.wrap !== false || options.lookahead) {
        regex = `(${(_a = options.lookahead) !== null && _a !== void 0 ? _a : ''}${regex})`;
    }
    if (options.cardinality) {
        return `${regex}${options.cardinality}`;
    }
    return regex;
}
//# sourceMappingURL=grammar-utils.js.map