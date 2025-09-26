/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import * as ast from '../languages/generated/ast.js';
import type { AstNode, CstNode } from '../syntax-tree.js';
/**
 * Returns the entry rule of the given grammar, if any. If the grammar file does not contain an entry rule,
 * the result is `undefined`.
 */
export declare function getEntryRule(grammar: ast.Grammar): ast.ParserRule | undefined;
/**
 * Returns all hidden terminal rules of the given grammar, if any.
 */
export declare function getHiddenRules(grammar: ast.Grammar): ast.TerminalRule[];
/**
 * Returns all rules that can be reached from the topmost rules of the specified grammar (entry and hidden terminal rules).
 *
 * @param grammar The grammar that contains all rules
 * @param allTerminals Whether or not to include terminals that are referenced only by other terminals
 * @returns A list of referenced parser and terminal rules. If the grammar contains no entry rule,
 *      this function returns all rules of the specified grammar.
 */
export declare function getAllReachableRules(grammar: ast.Grammar, allTerminals: boolean): Set<ast.AbstractRule>;
/**
 * Determines the grammar expression used to parse a cross-reference (usually a reference to a terminal rule).
 * A cross-reference can declare this expression explicitly in the form `[Type : Terminal]`, but if `Terminal`
 * is omitted, this function attempts to infer it from the name of the referenced `Type` (using `findNameAssignment`).
 *
 * Returns the grammar expression used to parse the given cross-reference, or `undefined` if it is not declared
 * and cannot be inferred.
 */
export declare function getCrossReferenceTerminal(crossRef: ast.CrossReference): ast.AbstractElement | undefined;
/**
 * Determines whether the given terminal rule represents a comment. This is true if the rule is marked
 * as `hidden` and it does not match white space. This means every hidden token (i.e. excluded from the AST)
 * that contains visible characters is considered a comment.
 */
export declare function isCommentTerminal(terminalRule: ast.TerminalRule): boolean;
/**
 * Find all CST nodes within the given node that contribute to the specified property.
 *
 * @param node A CST node in which to look for property assignments. If this is undefined, the result is an empty array.
 * @param property A property name of the constructed AST node. If this is undefined, the result is an empty array.
 */
export declare function findNodesForProperty(node: CstNode | undefined, property: string | undefined): CstNode[];
/**
 * Find a single CST node within the given node that contributes to the specified property.
 *
 * @param node A CST node in which to look for property assignments. If this is undefined, the result is `undefined`.
 * @param property A property name of the constructed AST node. If this is undefined, the result is `undefined`.
 * @param index If no index is specified or the index is less than zero, the first found node is returned. If the
 *        specified index exceeds the number of assignments to the property, the last found node is returned. Otherwise,
 *        the node with the specified index is returned.
 */
export declare function findNodeForProperty(node: CstNode | undefined, property: string | undefined, index?: number): CstNode | undefined;
/**
 * Find all CST nodes within the given node that correspond to the specified keyword.
 *
 * @param node A CST node in which to look for keywords. If this is undefined, the result is an empty array.
 * @param keyword A keyword as specified in the grammar.
 */
export declare function findNodesForKeyword(node: CstNode | undefined, keyword: string): CstNode[];
/**
 * Find a single CST node within the given node that corresponds to the specified keyword.
 *
 * @param node A CST node in which to look for keywords. If this is undefined, the result is `undefined`.
 * @param keyword A keyword as specified in the grammar.
 * @param index If no index is specified or the index is less than zero, the first found node is returned. If the
 *        specified index exceeds the number of keyword occurrences, the last found node is returned. Otherwise,
 *        the node with the specified index is returned.
 */
export declare function findNodeForKeyword(node: CstNode | undefined, keyword: string, index?: number): CstNode | undefined;
export declare function findNodesForKeywordInternal(node: CstNode, keyword: string, element: AstNode | undefined): CstNode[];
/**
 * If the given CST node was parsed in the context of a property assignment, the respective `Assignment` grammar
 * node is returned. If no assignment is found, the result is `undefined`.
 *
 * @param cstNode A CST node for which to find a property assignment.
 */
export declare function findAssignment(cstNode: CstNode): ast.Assignment | undefined;
/**
 * Find an assignment to the `name` property for the given grammar type. This requires the `type` to be inferred
 * from a parser rule, and that rule must contain an assignment to the `name` property. In all other cases,
 * this function returns `undefined`.
 */
export declare function findNameAssignment(type: ast.AbstractType): ast.Assignment | undefined;
export declare function getActionAtElement(element: ast.AbstractElement): ast.Action | undefined;
export type Cardinality = '?' | '*' | '+' | undefined;
export type Operator = '=' | '+=' | '?=' | undefined;
export declare function isOptionalCardinality(cardinality?: Cardinality, element?: ast.AbstractElement): boolean;
export declare function isArrayCardinality(cardinality?: Cardinality): boolean;
export declare function isArrayOperator(operator?: Operator): boolean;
/**
 * Determines whether the given parser rule is a _data type rule_, meaning that it has a
 * primitive return type like `number`, `boolean`, etc.
 */
export declare function isDataTypeRule(rule: ast.ParserRule): boolean;
export declare function isDataType(type: ast.Type): boolean;
export declare function getExplicitRuleType(rule: ast.ParserRule): string | undefined;
export declare function getTypeName(type: ast.AbstractType | ast.Action): string;
export declare function getActionType(action: ast.Action): string | undefined;
/**
 * This function is used at development time (for code generation and the internal type system) to get the type of the AST node produced by the given rule.
 * For data type rules, the name of the rule is returned,
 * e.g. "INT_value returns number: MY_INT;" returns "INT_value".
 * @param rule the given rule
 * @returns the name of the AST node type of the rule
 */
export declare function getRuleTypeName(rule: ast.AbstractRule): string;
/**
 * This function is used at runtime to get the actual type of the values produced by the given rule at runtime.
 * For data type rules, the name of the declared return type of the rule is returned (if any),
 * e.g. "INT_value returns number: MY_INT;" returns "number".
 * @param rule the given rule
 * @returns the name of the type of the produced values of the rule at runtime
 */
export declare function getRuleType(rule: ast.AbstractRule): string;
export declare function terminalRegex(terminalRule: ast.TerminalRule): RegExp;
//# sourceMappingURL=grammar-utils.d.ts.map