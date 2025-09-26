/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstNode } from '../syntax-tree.js';
/**
 * Language-specific service for locating an `AstNode` in a document.
 */
export interface AstNodeLocator {
    /**
     * Creates a path represented by a `string` that identifies an `AstNode` inside its document.
     * It must be possible to retrieve exactly the same `AstNode` from the document using this path.
     *
     * @param node The `AstNode` for which to create the path.
     * @returns a path represented by a `string` that identifies `node` inside its document.
     * @see AstNodeLocator.getAstNode
     */
    getAstNodePath(node: AstNode): string;
    /**
     * Locates an `AstNode` inside another node by following the given path.
     *
     * @param node Parent element.
     * @param path Describes how to locate the `AstNode` inside the given `node`.
     * @returns The `AstNode` located under the given path, or `undefined` if the path cannot be resolved.
     * @see AstNodeLocator.getAstNodePath
     */
    getAstNode<T extends AstNode = AstNode>(node: AstNode, path: string): T | undefined;
}
export declare class DefaultAstNodeLocator implements AstNodeLocator {
    protected segmentSeparator: string;
    protected indexSeparator: string;
    getAstNodePath(node: AstNode): string;
    protected getPathSegment({ $containerProperty, $containerIndex }: AstNode): string;
    getAstNode<T extends AstNode = AstNode>(node: AstNode, path: string): T | undefined;
}
//# sourceMappingURL=ast-node-locator.d.ts.map