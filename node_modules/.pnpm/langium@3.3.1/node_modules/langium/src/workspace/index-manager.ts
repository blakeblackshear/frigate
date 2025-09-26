/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, AstReflection } from '../syntax-tree.js';
import { getDocument } from '../utils/ast-utils.js';
import { ContextCache } from '../utils/caching.js';
import { CancellationToken } from '../utils/cancellation.js';
import type { Stream } from '../utils/stream.js';
import { stream } from '../utils/stream.js';
import type { URI } from '../utils/uri-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
import type { ReferenceDescription } from './ast-descriptions.js';
import type { LangiumDocument, LangiumDocuments } from './documents.js';

/**
 * The index manager is responsible for keeping metadata about symbols and cross-references
 * in the workspace. It is used to look up symbols in the global scope, mostly during linking
 * and completion. This service is shared between all languages of a language server.
 */
export interface IndexManager {

    /**
     * Removes the specified document URI from the index.
     * Necessary when documents are deleted and not referenceable anymore.
     *
     * @param uri The URI of the document for which index data shall be removed
     */
    remove(uri: URI): void;

    /**
     * Updates the information about the exportable content of a document inside the index.
     *
     * @param document Document to be updated
     * @param cancelToken Indicates when to cancel the current operation.
     * @throws `OperationCanceled` if a user action occurs during execution
     */
    updateContent(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void>;

    /**
     * Updates the information about the cross-references of a document inside the index.
     *
     * @param document Document to be updated
     * @param cancelToken Indicates when to cancel the current operation.
     * @throws `OperationCanceled` if a user action occurs during execution
     */
    updateReferences(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void>;

    /**
     * Determine whether the given document could be affected by changes of the documents
     * identified by the given URIs (second parameter). The document is typically regarded as
     * affected if it contains a reference to any of the changed files.
     *
     * @param document Document to check whether it's affected
     * @param changedUris URIs of the changed documents
     */
    isAffected(document: LangiumDocument, changedUris: Set<string>): boolean;

    /**
     * Compute a list of all exported elements, optionally filtered using a type identifier and document URIs.
     *
     * @param nodeType The type to filter with, or `undefined` to return descriptions of all types.
     * @param uris If specified, only returns elements from the given URIs.
     * @returns a `Stream` containing all globally visible nodes (of a given type).
     */
    allElements(nodeType?: string, uris?: Set<string>): Stream<AstNodeDescription>;

    /**
     * Returns all known references that are pointing to the given `targetNode`.
     *
     * @param targetNode the `AstNode` to look up references for
     * @param astNodePath the path that points to the `targetNode` inside the document. See also `AstNodeLocator`
     *
     * @returns a `Stream` of references that are targeting the `targetNode`
     */
    findAllReferences(targetNode: AstNode, astNodePath: string): Stream<ReferenceDescription>;

}

export class DefaultIndexManager implements IndexManager {

    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly documents: LangiumDocuments;
    protected readonly astReflection: AstReflection;

    /**
     * The symbol index stores all `AstNodeDescription` items exported by a document.
     * The key used in this map is the string representation of the specific document URI.
     */
    protected readonly symbolIndex = new Map<string, AstNodeDescription[]>();
    /**
     * This is a cache for the `allElements()` method.
     * It caches the descriptions from `symbolIndex` grouped by types.
     */
    protected readonly symbolByTypeIndex = new ContextCache<string, string, AstNodeDescription[]>();
    /**
     * This index keeps track of all `ReferenceDescription` items exported by a document.
     * This is used to compute which elements are affected by a document change
     * and for finding references to an AST node.
     */
    protected readonly referenceIndex = new Map<string, ReferenceDescription[]>();

    constructor(services: LangiumSharedCoreServices) {
        this.documents = services.workspace.LangiumDocuments;
        this.serviceRegistry = services.ServiceRegistry;
        this.astReflection = services.AstReflection;
    }

    findAllReferences(targetNode: AstNode, astNodePath: string): Stream<ReferenceDescription> {
        const targetDocUri = getDocument(targetNode).uri;
        const result: ReferenceDescription[] = [];
        this.referenceIndex.forEach(docRefs => {
            docRefs.forEach(refDescr => {
                if (UriUtils.equals(refDescr.targetUri, targetDocUri) && refDescr.targetPath === astNodePath) {
                    result.push(refDescr);
                }
            });
        });
        return stream(result);
    }

    allElements(nodeType?: string, uris?: Set<string>): Stream<AstNodeDescription> {
        let documentUris = stream(this.symbolIndex.keys());
        if (uris) {
            documentUris = documentUris.filter(uri => !uris || uris.has(uri));
        }
        return documentUris
            .map(uri => this.getFileDescriptions(uri, nodeType))
            .flat();
    }

    protected getFileDescriptions(uri: string, nodeType?: string): AstNodeDescription[] {
        if (!nodeType) {
            return this.symbolIndex.get(uri) ?? [];
        }
        const descriptions = this.symbolByTypeIndex.get(uri, nodeType, () => {
            const allFileDescriptions = this.symbolIndex.get(uri) ?? [];
            return allFileDescriptions.filter(e => this.astReflection.isSubtype(e.type, nodeType));
        });
        return descriptions;
    }

    remove(uri: URI): void {
        const uriString = uri.toString();
        this.symbolIndex.delete(uriString);
        this.symbolByTypeIndex.clear(uriString);
        this.referenceIndex.delete(uriString);
    }

    async updateContent(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        const services = this.serviceRegistry.getServices(document.uri);
        const exports = await services.references.ScopeComputation.computeExports(document, cancelToken);
        const uri = document.uri.toString();
        this.symbolIndex.set(uri, exports);
        this.symbolByTypeIndex.clear(uri);
    }

    async updateReferences(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        const services = this.serviceRegistry.getServices(document.uri);
        const indexData = await services.workspace.ReferenceDescriptionProvider.createDescriptions(document, cancelToken);
        this.referenceIndex.set(document.uri.toString(), indexData);
    }

    isAffected(document: LangiumDocument, changedUris: Set<string>): boolean {
        const references = this.referenceIndex.get(document.uri.toString());
        if (!references) {
            return false;
        }
        return references.some(ref => !ref.local && changedUris.has(ref.targetUri.toString()));
    }

}
