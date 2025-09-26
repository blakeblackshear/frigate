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
export declare class DefaultAstNodeDescriptionProvider implements AstNodeDescriptionProvider {
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly nameProvider: NameProvider;
    constructor(services: LangiumCoreServices);
    createDescription(node: AstNode, name: string | undefined, document?: LangiumDocument): AstNodeDescription;
}
/**
 * Describes a cross-reference within a document or between two documents.
 */
export interface ReferenceDescription {
    /** URI of the document that holds a reference */
    sourceUri: URI;
    /** Path to AstNode that holds a reference */
    sourcePath: string;
    /** Target document uri */
    targetUri: URI;
    /** Path to the target AstNode inside the document */
    targetPath: string;
    /** Segment of the reference text. */
    segment: DocumentSegment;
    /** Marks a local reference i.e. a cross reference inside a document.   */
    local?: boolean;
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
export declare class DefaultReferenceDescriptionProvider implements ReferenceDescriptionProvider {
    protected readonly nodeLocator: AstNodeLocator;
    constructor(services: LangiumCoreServices);
    createDescriptions(document: LangiumDocument, cancelToken?: CancellationToken): Promise<ReferenceDescription[]>;
    protected createDescription(refInfo: ReferenceInfo): ReferenceDescription | undefined;
}
//# sourceMappingURL=ast-descriptions.d.ts.map