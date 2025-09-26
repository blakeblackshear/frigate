/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { URI } from '../utils/uri-utils.js';
import type { NameProvider } from '../references/name-provider.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, ReferenceInfo } from '../syntax-tree.js';
import type { AstNodeLocator } from './ast-node-locator.js';
import type { DocumentSegment, LangiumDocument } from './documents.js';
import { CancellationToken } from '../utils/cancellation.js';
import { isLinkingError } from '../syntax-tree.js';
import { getDocument, streamAst, streamReferences } from '../utils/ast-utils.js';
import { toDocumentSegment } from '../utils/cst-utils.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
import { UriUtils } from '../utils/uri-utils.js';

/**
 * Language-specific service for creating descriptions of AST nodes to be used for cross-reference resolutions.
 */
export interface AstNodeDescriptionProvider {

    /**
     * Create a description for the given AST node. This service method is typically used while indexing
     * the contents of a document and during scope computation.
     *
     * @param node An AST node.
     * @param name The name to be used to refer to the AST node. By default, this is determined by the
     *     `NameProvider` service, but alternative names may be provided according to the semantics
     *     of your language.
     * @param document The document containing the AST node. If omitted, it is taken from the root AST node.
     */
    createDescription(node: AstNode, name: string | undefined, document?: LangiumDocument): AstNodeDescription;

}

export class DefaultAstNodeDescriptionProvider implements AstNodeDescriptionProvider {

    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly nameProvider: NameProvider;

    constructor(services: LangiumCoreServices) {
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.nameProvider = services.references.NameProvider;
    }

    createDescription(node: AstNode, name: string | undefined, document?: LangiumDocument): AstNodeDescription {
        const doc = document ?? getDocument(node);
        name ??= this.nameProvider.getName(node);
        const path = this.astNodeLocator.getAstNodePath(node);
        if (!name) {
            throw new Error(`Node at path ${path} has no name.`);
        }
        let nameNodeSegment: DocumentSegment | undefined;
        const nameSegmentGetter = () => nameNodeSegment ??= toDocumentSegment(this.nameProvider.getNameNode(node) ?? node.$cstNode);
        return {
            node,
            name,
            get nameSegment() {
                return nameSegmentGetter();
            },
            selectionSegment: toDocumentSegment(node.$cstNode),
            type: node.$type,
            documentUri: doc.uri,
            path
        };
    }

}

/**
 * Describes a cross-reference within a document or between two documents.
 */
export interface ReferenceDescription {
    /** URI of the document that holds a reference */
    sourceUri: URI
    /** Path to AstNode that holds a reference */
    sourcePath: string
    /** Target document uri */
    targetUri: URI
    /** Path to the target AstNode inside the document */
    targetPath: string
    /** Segment of the reference text. */
    segment: DocumentSegment
    /** Marks a local reference i.e. a cross reference inside a document.   */
    local?: boolean
}

/**
 * Language-specific service to create descriptions of all cross-references in a document. These are used by the `IndexManager`
 * to determine which documents are affected and should be rebuilt when a document is changed.
 */
export interface ReferenceDescriptionProvider {
    /**
     * Create descriptions of all cross-references found in the given document. These descriptions are
     * gathered by the `IndexManager` and stored in the global index so they can be considered when
     * a document change is reported by the client.
     *
     * @param document The document in which to gather cross-references.
     * @param cancelToken Indicates when to cancel the current operation.
     * @throws `OperationCanceled` if a user action occurs during execution
     */
    createDescriptions(document: LangiumDocument, cancelToken?: CancellationToken): Promise<ReferenceDescription[]>;
}

export class DefaultReferenceDescriptionProvider implements ReferenceDescriptionProvider {

    protected readonly nodeLocator: AstNodeLocator;

    constructor(services: LangiumCoreServices) {
        this.nodeLocator = services.workspace.AstNodeLocator;
    }

    async createDescriptions(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<ReferenceDescription[]> {
        const descr: ReferenceDescription[] = [];
        const rootNode = document.parseResult.value;
        for (const astNode of streamAst(rootNode)) {
            await interruptAndCheck(cancelToken);
            streamReferences(astNode).filter(refInfo => !isLinkingError(refInfo)).forEach(refInfo => {
                // TODO: Consider logging a warning or throw an exception when DocumentState is < than Linked
                const description = this.createDescription(refInfo);
                if (description) {
                    descr.push(description);
                }
            });
        }
        return descr;
    }

    protected createDescription(refInfo: ReferenceInfo): ReferenceDescription | undefined {
        const targetNodeDescr = refInfo.reference.$nodeDescription;
        const refCstNode = refInfo.reference.$refNode;
        if (!targetNodeDescr || !refCstNode) {
            return undefined;
        }
        const docUri = getDocument(refInfo.container).uri;
        return {
            sourceUri: docUri,
            sourcePath: this.nodeLocator.getAstNodePath(refInfo.container),
            targetUri: targetNodeDescr.documentUri,
            targetPath: targetNodeDescr.path,
            segment: toDocumentSegment(refCstNode),
            local: UriUtils.equals(targetNodeDescr.documentUri, docUri)
        };
    }

}
