/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstNode, CstNode } from '../syntax-tree.js';
export interface NamedAstNode extends AstNode {
    name: string;
}
export declare function isNamed(node: AstNode): node is NamedAstNode;
/**
 * Utility service for retrieving the `name` of an `AstNode` or the `CstNode` containing a `name`.
 */
export interface NameProvider {
    /**
     * Returns the `name` of a given AstNode.
     * @param node Specified `AstNode` whose name node shall be retrieved.
     */
    getName(node: AstNode): string | undefined;
    /**
     * Returns the `CstNode` which contains the parsed value of the `name` assignment.
     * @param node Specified `AstNode` whose name node shall be retrieved.
     */
    getNameNode(node: AstNode): CstNode | undefined;
}
export declare class DefaultNameProvider implements NameProvider {
    getName(node: AstNode): string | undefined;
    getNameNode(node: AstNode): CstNode | undefined;
}
//# sourceMappingURL=name-provider.d.ts.map