/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { IToken } from '@chevrotain/types';
import type { Range } from 'vscode-languageserver-types';
import type { CstNode, LeafCstNode } from '../syntax-tree.js';
import type { DocumentSegment } from '../workspace/documents.js';
import type { Stream, TreeStream } from './stream.js';
/**
 * Create a stream of all CST nodes that are directly and indirectly contained in the given root node,
 * including the root node itself.
 */
export declare function streamCst(node: CstNode): TreeStream<CstNode>;
/**
 * Create a stream of all leaf nodes that are directly and indirectly contained in the given root node.
 */
export declare function flattenCst(node: CstNode): Stream<LeafCstNode>;
/**
 * Determines whether the specified cst node is a child of the specified parent node.
 */
export declare function isChildNode(child: CstNode, parent: CstNode): boolean;
export declare function tokenToRange(token: IToken): Range;
export declare function toDocumentSegment(node: CstNode): DocumentSegment;
export declare function toDocumentSegment(node?: CstNode): DocumentSegment | undefined;
export declare enum RangeComparison {
    Before = 0,
    After = 1,
    OverlapFront = 2,
    OverlapBack = 3,
    Inside = 4,
    Outside = 5
}
export declare function compareRange(range: Range, to: Range): RangeComparison;
export declare function inRange(range: Range, to: Range): boolean;
export declare const DefaultNameRegexp: RegExp;
/**
 * Performs `findLeafNodeAtOffset` with a minor difference: When encountering a character that matches the `nameRegexp` argument,
 * it will instead return the leaf node at the `offset - 1` position.
 *
 * For LSP services, users expect that the declaration of an element is available if the cursor is directly after the element.
 */
export declare function findDeclarationNodeAtOffset(cstNode: CstNode | undefined, offset: number, nameRegexp?: RegExp): LeafCstNode | undefined;
export declare function findCommentNode(cstNode: CstNode | undefined, commentNames: string[]): CstNode | undefined;
export declare function isCommentNode(cstNode: CstNode, commentNames: string[]): boolean;
/**
 * Finds the leaf CST node at the specified 0-based string offset.
 * Note that the given offset will be within the range of the returned leaf node.
 *
 * If the offset does not point to a CST node (but just white space), this method will return `undefined`.
 *
 * @param node The CST node to search through.
 * @param offset The specified offset.
 * @returns The CST node at the specified offset.
 */
export declare function findLeafNodeAtOffset(node: CstNode, offset: number): LeafCstNode | undefined;
/**
 * Finds the leaf CST node at the specified 0-based string offset.
 * If no CST node exists at the specified position, it will return the leaf node before it.
 *
 * If there is no leaf node before the specified offset, this method will return `undefined`.
 *
 * @param node The CST node to search through.
 * @param offset The specified offset.
 * @returns The CST node closest to the specified offset.
 */
export declare function findLeafNodeBeforeOffset(node: CstNode, offset: number): LeafCstNode | undefined;
export declare function getPreviousNode(node: CstNode, hidden?: boolean): CstNode | undefined;
export declare function getNextNode(node: CstNode, hidden?: boolean): CstNode | undefined;
export declare function getStartlineNode(node: CstNode): CstNode;
export declare function getInteriorNodes(start: CstNode, end: CstNode): CstNode[];
//# sourceMappingURL=cst-utils.d.ts.map