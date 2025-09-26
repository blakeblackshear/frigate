/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, CstNode } from '../syntax-tree.js';
import type { Stream } from '../utils/stream.js';
import type { ReferenceDescription } from '../workspace/ast-descriptions.js';
import type { AstNodeLocator } from '../workspace/ast-node-locator.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { NameProvider } from './name-provider.js';
import type { URI } from '../utils/uri-utils.js';
/**
 * Language-specific service for finding references and declaration of a given `CstNode`.
 */
export interface References {
    /**
     * If the CstNode is a reference node the target CstNode will be returned.
     * If the CstNode is a significant node of the CstNode this CstNode will be returned.
     *
     * @param sourceCstNode CstNode that points to a AstNode
     */
    findDeclaration(sourceCstNode: CstNode): AstNode | undefined;
    /**
     * If the CstNode is a reference node the target CstNode will be returned.
     * If the CstNode is a significant node of the CstNode this CstNode will be returned.
     *
     * @param sourceCstNode CstNode that points to a AstNode
     */
    findDeclarationNode(sourceCstNode: CstNode): CstNode | undefined;
    /**
     * Finds all references to the target node as references (local references) or reference descriptions.
     *
     * @param targetNode Specified target node whose references should be returned
     */
    findReferences(targetNode: AstNode, options: FindReferencesOptions): Stream<ReferenceDescription>;
}
export interface FindReferencesOptions {
    /**
     * @deprecated Since v1.2.0. Please use `documentUri` instead.
     */
    onlyLocal?: boolean;
    /**
     * When set, the `findReferences` method will only return references/declarations from the specified document.
     */
    documentUri?: URI;
    /**
     * Whether the returned list of references should include the declaration.
     */
    includeDeclaration?: boolean;
}
export declare class DefaultReferences implements References {
    protected readonly nameProvider: NameProvider;
    protected readonly index: IndexManager;
    protected readonly nodeLocator: AstNodeLocator;
    constructor(services: LangiumCoreServices);
    findDeclaration(sourceCstNode: CstNode): AstNode | undefined;
    findDeclarationNode(sourceCstNode: CstNode): CstNode | undefined;
    findReferences(targetNode: AstNode, options: FindReferencesOptions): Stream<ReferenceDescription>;
    protected getReferenceToSelf(targetNode: AstNode): ReferenceDescription | undefined;
}
//# sourceMappingURL=references.d.ts.map