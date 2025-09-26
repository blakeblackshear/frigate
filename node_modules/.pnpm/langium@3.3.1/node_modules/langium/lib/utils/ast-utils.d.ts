/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Range } from 'vscode-languageserver-types';
import type { AstNode, AstReflection, CstNode, Reference, ReferenceInfo } from '../syntax-tree.js';
import type { Stream, TreeStream } from './stream.js';
import type { LangiumDocument } from '../workspace/documents.js';
/**
 * Link the `$container` and other related properties of every AST node that is directly contained
 * in the given `node`.
 */
export declare function linkContentToContainer(node: AstNode): void;
/**
 * Walk along the hierarchy of containers from the given AST node to the root and return the first
 * node that matches the type predicate. If the start node itself matches, it is returned.
 * If no container matches, `undefined` is returned.
 */
export declare function getContainerOfType<T extends AstNode>(node: AstNode | undefined, typePredicate: (n: AstNode) => n is T): T | undefined;
/**
 * Walk along the hierarchy of containers from the given AST node to the root and check for existence
 * of a container that matches the given predicate. The start node is included in the checks.
 */
export declare function hasContainerOfType(node: AstNode | undefined, predicate: (n: AstNode) => boolean): boolean;
/**
 * Retrieve the document in which the given AST node is contained. A reference to the document is
 * usually held by the root node of the AST.
 *
 * @throws an error if the node is not contained in a document.
 */
export declare function getDocument<T extends AstNode = AstNode>(node: AstNode): LangiumDocument<T>;
/**
 * Returns the root node of the given AST node by following the `$container` references.
 */
export declare function findRootNode(node: AstNode): AstNode;
export interface AstStreamOptions {
    /**
     * Optional target range that the nodes in the stream need to intersect
     */
    range?: Range;
}
/**
 * Create a stream of all AST nodes that are directly contained in the given node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export declare function streamContents(node: AstNode, options?: AstStreamOptions): Stream<AstNode>;
/**
 * Create a stream of all AST nodes that are directly and indirectly contained in the given root node.
 * This does not include the root node itself.
 */
export declare function streamAllContents(root: AstNode, options?: AstStreamOptions): TreeStream<AstNode>;
/**
 * Create a stream of all AST nodes that are directly and indirectly contained in the given root node,
 * including the root node itself.
 */
export declare function streamAst(root: AstNode, options?: AstStreamOptions): TreeStream<AstNode>;
/**
 * Create a stream of all cross-references that are held by the given AST node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export declare function streamReferences(node: AstNode): Stream<ReferenceInfo>;
/**
 * Returns a Stream of references to the target node from the AstNode tree
 *
 * @param targetNode AstNode we are looking for
 * @param lookup AstNode where we search for references. If not provided, the root node of the document is used as the default value
 */
export declare function findLocalReferences(targetNode: AstNode, lookup?: AstNode): Stream<Reference>;
/**
 * Assigns all mandatory AST properties to the specified node.
 *
 * @param reflection Reflection object used to gather mandatory properties for the node.
 * @param node Specified node is modified in place and properties are directly assigned.
 */
export declare function assignMandatoryProperties(reflection: AstReflection, node: AstNode): void;
/**
 * Creates a deep copy of the specified AST node.
 * The resulting copy will only contain semantically relevant information, such as the `$type` property and AST properties.
 *
 * References are copied without resolved cross reference. The specified function is used to rebuild them.
 */
export declare function copyAstNode<T extends AstNode = AstNode>(node: T, buildReference: (node: AstNode, property: string, refNode: CstNode | undefined, refText: string) => Reference<AstNode>): T;
//# sourceMappingURL=ast-utils.d.ts.map