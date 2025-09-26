/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, AstReflection, CstNode, LinkingError, Reference, ReferenceInfo } from '../syntax-tree.js';
import type { AstNodeLocator } from '../workspace/ast-node-locator.js';
import type { LangiumDocument, LangiumDocuments } from '../workspace/documents.js';
import type { ScopeProvider } from './scope-provider.js';
import { CancellationToken } from '../utils/cancellation.js';
/**
 * Language-specific service for resolving cross-references in the AST.
 */
export interface Linker {
    /**
     * Links all cross-references within the specified document. The default implementation loads only target
     * elements from documents that are present in the `LangiumDocuments` service. The linked references are
     * stored in the document's `references` property.
     *
     * @param document A LangiumDocument that shall be linked.
     * @param cancelToken A token for cancelling the operation.
     *
     * @throws `OperationCancelled` if a cancellation event is detected
     */
    link(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void>;
    /**
     * Unlinks all references within the specified document and removes them from the list of `references`.
     *
     * @param document A LangiumDocument that shall be unlinked.
     */
    unlink(document: LangiumDocument): void;
    /**
     * Determines a candidate AST node description for linking the given reference.
     *
     * @param refInfo Information about the reference.
     */
    getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError;
    /**
     * Creates a cross reference node being aware of its containing AstNode, the corresponding CstNode,
     * the cross reference text denoting the target AstNode being already extracted of the document text,
     * as well as the unique cross reference identifier.
     *
     * Default behavior:
     *  - The returned Reference's 'ref' property pointing to the target AstNode is populated lazily on its
     *    first visit.
     *  - If the target AstNode cannot be resolved on the first visit, an error indicator will be installed
     *    and further resolution attempts will *not* be performed.
     *
     * @param node The containing AST node
     * @param property The AST node property being referenced
     * @param refNode The corresponding CST node
     * @param refText The cross reference text denoting the target AstNode
     * @returns the desired Reference node, whose behavior wrt. resolving the cross reference is implementation specific.
     */
    buildReference(node: AstNode, property: string, refNode: CstNode | undefined, refText: string): Reference;
}
export declare class DefaultLinker implements Linker {
    protected readonly reflection: AstReflection;
    protected readonly scopeProvider: ScopeProvider;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly langiumDocuments: () => LangiumDocuments;
    constructor(services: LangiumCoreServices);
    link(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void>;
    protected doLink(refInfo: ReferenceInfo, document: LangiumDocument): void;
    unlink(document: LangiumDocument): void;
    getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError;
    buildReference(node: AstNode, property: string, refNode: CstNode | undefined, refText: string): Reference;
    protected getLinkedNode(refInfo: ReferenceInfo): {
        node?: AstNode;
        descr?: AstNodeDescription;
        error?: LinkingError;
    };
    protected loadAstNode(nodeDescription: AstNodeDescription): AstNode | undefined;
    protected createLinkingError(refInfo: ReferenceInfo, targetDescription?: AstNodeDescription): LinkingError;
}
//# sourceMappingURL=linker.d.ts.map