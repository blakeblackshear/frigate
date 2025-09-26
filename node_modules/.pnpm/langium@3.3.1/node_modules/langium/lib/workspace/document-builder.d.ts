/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { Disposable } from '../utils/disposable.js';
import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import type { AstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { Deferred } from '../utils/promise-utils.js';
import type { ValidationOptions } from '../validation/document-validator.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { LangiumDocument, LangiumDocuments, LangiumDocumentFactory, TextDocumentProvider } from './documents.js';
import { MultiMap } from '../utils/collections.js';
import type { URI } from '../utils/uri-utils.js';
import { ValidationCategory } from '../validation/validation-registry.js';
import { DocumentState } from './documents.js';
export interface BuildOptions {
    /**
     * Control the validation phase with this option:
     *  - `true` enables all validation checks and forces revalidating the documents
     *  - `false` or `undefined` disables all validation checks
     *  - An object runs only the necessary validation checks; the `categories` property restricts this to a specific subset
     */
    validation?: boolean | ValidationOptions;
}
export interface DocumentBuildState {
    /** Whether a document has completed its last build process. */
    completed: boolean;
    /** The options used for the last build process. */
    options: BuildOptions;
    /** Additional information about the last build result. */
    result?: {
        validationChecks?: ValidationCategory[];
    };
}
/**
 * Shared-service for building and updating `LangiumDocument`s.
 */
export interface DocumentBuilder {
    /** The options used for rebuilding documents after an update. */
    updateBuildOptions: BuildOptions;
    /**
     * Execute all necessary build steps for the given documents.
     *
     * @param documents Set of documents to be built.
     * @param options Options for the document builder.
     * @param cancelToken Indicates when to cancel the current operation.
     * @throws `OperationCanceled` if a user action occurs during execution
     */
    build<T extends AstNode>(documents: Array<LangiumDocument<T>>, options?: BuildOptions, cancelToken?: CancellationToken): Promise<void>;
    /**
     * This method is called when a document change is detected. It updates the state of all
     * affected documents, including those with references to the changed ones, so they are rebuilt.
     *
     * @param changed URIs of changed or created documents
     * @param deleted URIs of deleted documents
     * @param cancelToken allows to cancel the current operation
     * @throws `OperationCancelled` if cancellation is detected during execution
     */
    update(changed: URI[], deleted: URI[], cancelToken?: CancellationToken): Promise<void>;
    /**
     * Notify the given callback when a document update was triggered, but before any document
     * is rebuilt. Listeners to this event should not perform any long-running task.
     */
    onUpdate(callback: DocumentUpdateListener): Disposable;
    /**
     * Notify the given callback when a set of documents has been built reaching the specified target state.
     */
    onBuildPhase(targetState: DocumentState, callback: DocumentBuildListener): Disposable;
    /**
     * Notify the specified callback when a document has been built reaching the specified target state.
     * Unlike {@link onBuildPhase} the listener is called for every single document.
     *
     * There are two main advantages compared to {@link onBuildPhase}:
     * 1. If the build is cancelled, {@link onDocumentPhase} will still fire for documents that have reached a specific state.
     *    Meanwhile, {@link onBuildPhase} won't fire for that state.
     * 2. The {@link DocumentBuilder} ensures that all {@link DocumentPhaseListener} instances are called for a built document.
     *    Even if the build is cancelled before those listeners were called.
     */
    onDocumentPhase(targetState: DocumentState, callback: DocumentPhaseListener): Disposable;
    /**
     * Wait until the workspace has reached the specified state for all documents.
     *
     * @param state The desired state. The promise won't resolve until all documents have reached this state
     * @param cancelToken Optionally allows to cancel the wait operation, disposing any listeners in the process
     * @throws `OperationCancelled` if cancellation has been requested before the state has been reached
     */
    waitUntil(state: DocumentState, cancelToken?: CancellationToken): Promise<void>;
    /**
     * Wait until the document specified by the {@link uri} has reached the specified state.
     *
     * @param state The desired state. The promise won't resolve until the document has reached this state.
     * @param uri The specified URI that points to the document. If the URI does not exist, the promise will resolve once the workspace has reached the specified state.
     * @param cancelToken Optionally allows to cancel the wait operation, disposing any listeners in the process.
     * @return The URI of the document that has reached the desired state, or `undefined` if the document does not exist.
     * @throws `OperationCancelled` if cancellation has been requested before the state has been reached
     */
    waitUntil(state: DocumentState, uri?: URI, cancelToken?: CancellationToken): Promise<URI | undefined>;
}
export type DocumentUpdateListener = (changed: URI[], deleted: URI[]) => void | Promise<void>;
export type DocumentBuildListener = (built: LangiumDocument[], cancelToken: CancellationToken) => void | Promise<void>;
export type DocumentPhaseListener = (built: LangiumDocument, cancelToken: CancellationToken) => void | Promise<void>;
export declare class DefaultDocumentBuilder implements DocumentBuilder {
    updateBuildOptions: BuildOptions;
    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly langiumDocumentFactory: LangiumDocumentFactory;
    protected readonly textDocuments: TextDocumentProvider | undefined;
    protected readonly indexManager: IndexManager;
    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly updateListeners: DocumentUpdateListener[];
    protected readonly buildPhaseListeners: MultiMap<DocumentState, DocumentBuildListener>;
    protected readonly documentPhaseListeners: MultiMap<DocumentState, DocumentPhaseListener>;
    protected readonly buildState: Map<string, DocumentBuildState>;
    protected readonly documentBuildWaiters: Map<string, Deferred<void>>;
    protected currentState: DocumentState;
    constructor(services: LangiumSharedCoreServices);
    build<T extends AstNode>(documents: Array<LangiumDocument<T>>, options?: BuildOptions, cancelToken?: CancellationToken): Promise<void>;
    update(changed: URI[], deleted: URI[], cancelToken?: CancellationToken): Promise<void>;
    protected emitUpdate(changed: URI[], deleted: URI[]): Promise<void>;
    /**
     * Sort the given documents by priority. By default, documents with an open text document are prioritized.
     * This is useful to ensure that visible documents show their diagnostics before all other documents.
     *
     * This improves the responsiveness in large workspaces as users usually don't care about diagnostics
     * in files that are currently not opened in the editor.
     */
    protected sortDocuments(documents: LangiumDocument[]): LangiumDocument[];
    private hasTextDocument;
    /**
     * Check whether the given document should be relinked after changes were found in the given URIs.
     */
    protected shouldRelink(document: LangiumDocument, changedUris: Set<string>): boolean;
    onUpdate(callback: DocumentUpdateListener): Disposable;
    /**
     * Build the given documents by stepping through all build phases. If a document's state indicates
     * that a certain build phase is already done, the phase is skipped for that document.
     *
     * @param documents The documents to build.
     * @param options the {@link BuildOptions} to use.
     * @param cancelToken A cancellation token that can be used to cancel the build.
     * @returns A promise that resolves when the build is done.
     */
    protected buildDocuments(documents: LangiumDocument[], options: BuildOptions, cancelToken: CancellationToken): Promise<void>;
    /**
     * Runs prior to beginning the build process to update the {@link DocumentBuildState} for each document
     *
     * @param documents collection of documents to be built
     * @param options the {@link BuildOptions} to use
     */
    protected prepareBuild(documents: LangiumDocument[], options: BuildOptions): void;
    /**
     * Runs a cancelable operation on a set of documents to bring them to a specified {@link DocumentState}.
     *
     * @param documents The array of documents to process.
     * @param targetState The target {@link DocumentState} to bring the documents to.
     * @param cancelToken A token that can be used to cancel the operation.
     * @param callback A function to be called for each document.
     * @returns A promise that resolves when all documents have been processed or the operation is canceled.
     * @throws Will throw `OperationCancelled` if the operation is canceled via a `CancellationToken`.
     */
    protected runCancelable(documents: LangiumDocument[], targetState: DocumentState, cancelToken: CancellationToken, callback: (document: LangiumDocument) => MaybePromise<unknown>): Promise<void>;
    onBuildPhase(targetState: DocumentState, callback: DocumentBuildListener): Disposable;
    onDocumentPhase(targetState: DocumentState, callback: DocumentPhaseListener): Disposable;
    waitUntil(state: DocumentState, cancelToken?: CancellationToken): Promise<void>;
    waitUntil(state: DocumentState, uri?: URI, cancelToken?: CancellationToken): Promise<URI | undefined>;
    protected notifyDocumentPhase(document: LangiumDocument, state: DocumentState, cancelToken: CancellationToken): Promise<void>;
    protected notifyBuildPhase(documents: LangiumDocument[], state: DocumentState, cancelToken: CancellationToken): Promise<void>;
    /**
     * Determine whether the given document should be validated during a build. The default
     * implementation checks the `validation` property of the build options. If it's set to `true`
     * or a `ValidationOptions` object, the document is included in the validation phase.
     */
    protected shouldValidate(document: LangiumDocument): boolean;
    /**
     * Run validation checks on the given document and store the resulting diagnostics in the document.
     * If the document already contains diagnostics, the new ones are added to the list.
     */
    protected validate(document: LangiumDocument, cancelToken: CancellationToken): Promise<void>;
    protected getBuildOptions(document: LangiumDocument): BuildOptions;
}
//# sourceMappingURL=document-builder.d.ts.map