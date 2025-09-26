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

export class DefaultAstNodeLocator implements AstNodeLocator {
    protected segmentSeparator = '/';
    protected indexSeparator = '@';

    getAstNodePath(node: AstNode): string {
        if (node.$container) {
            const containerPath = this.getAstNodePath(node.$container);
            const newSegment = this.getPathSegment(node);
            const nodePath = containerPath + this.segmentSeparator + newSegment;
            return nodePath;
        }
        return '';
    }

    protected getPathSegment({ $containerProperty, $containerIndex }: AstNode): string {
        if (!$containerProperty) {
            throw new Error("Missing '$containerProperty' in AST node.");
        }
        if ($containerIndex !== undefined) {
            return $containerProperty + this.indexSeparator + $containerIndex;
        }
        return $containerProperty;
    }

    getAstNode<T extends AstNode = AstNode>(node: AstNode, path: string): T | undefined {
        const segments = path.split(this.segmentSeparator);
        return segments.reduce((previousValue, currentValue) => {
            if (!previousValue || currentValue.length === 0) {
                return previousValue;
            }
            const propertyIndex = currentValue.indexOf(this.indexSeparator);
            if (propertyIndex > 0) {
                const property = currentValue.substring(0, propertyIndex);
                const arrayIndex = parseInt(currentValue.substring(propertyIndex + 1));
                const array = (previousValue as unknown as Record<string, AstNode[]>)[property];
                return array?.[arrayIndex];
            }
            return (previousValue as unknown as Record<string, AstNode>)[currentValue];
        }, node) as T;
    }

}
