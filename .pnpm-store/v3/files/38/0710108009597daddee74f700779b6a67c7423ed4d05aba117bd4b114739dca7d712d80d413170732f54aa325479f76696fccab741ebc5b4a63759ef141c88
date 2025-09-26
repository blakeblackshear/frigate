/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { TextDocumentWillSaveEvent, DidChangeWatchedFilesParams, TextDocumentChangeEvent, TextEdit } from 'vscode-languageserver';
import { URI } from '../utils/uri-utils.js';
import type { DocumentBuilder } from '../workspace/document-builder.js';
import type { TextDocument } from '../workspace/documents.js';
import type { WorkspaceLock } from '../workspace/workspace-lock.js';
import type { LangiumSharedServices } from './lsp-services.js';
import type { WorkspaceManager } from '../workspace/workspace-manager.js';
import type { ServiceRegistry } from '../service-registry.js';
import type { MaybePromise } from '../utils/promise-utils.js';
/**
 * Shared service for handling text document changes and watching relevant files.
 */
export interface DocumentUpdateHandler {
    /**
     * A document open event was triggered by the `TextDocuments` service.
     * @param event The document change event.
     */
    didOpenDocument?(event: TextDocumentChangeEvent<TextDocument>): void;
    /**
     * A content change event was triggered by the `TextDocuments` service.
     * @param event The document change event.
     */
    didChangeContent?(event: TextDocumentChangeEvent<TextDocument>): void;
    /**
     * A document save event (initiated) was triggered by the `TextDocuments` service.
     * @param event The document change event.
     */
    willSaveDocument?(event: TextDocumentWillSaveEvent<TextDocument>): void;
    /**
     * A document save event (initiated) was triggered by the `TextDocuments` service.
     * @param event The document change event.
     * @returns An array of text edits which will be applied to the document before it is saved.
     */
    willSaveDocumentWaitUntil?(event: TextDocumentWillSaveEvent<TextDocument>): MaybePromise<TextEdit[]>;
    /**
     * A document save event (completed) was triggered by the `TextDocuments` service.
     * @param event The document change event.
     */
    didSaveDocument?(event: TextDocumentChangeEvent<TextDocument>): void;
    /**
     * A document close event was triggered by the `TextDocuments` service.
     * @param event The document change event.
     */
    didCloseDocument?(event: TextDocumentChangeEvent<TextDocument>): void;
    /**
     * The client detected changes to files and folders watched by the language client.
     * @param params The files/folders change event.
     */
    didChangeWatchedFiles?(params: DidChangeWatchedFilesParams): void;
}
export declare class DefaultDocumentUpdateHandler implements DocumentUpdateHandler {
    protected readonly workspaceManager: WorkspaceManager;
    protected readonly documentBuilder: DocumentBuilder;
    protected readonly workspaceLock: WorkspaceLock;
    protected readonly serviceRegistry: ServiceRegistry;
    constructor(services: LangiumSharedServices);
    protected registerFileWatcher(services: LangiumSharedServices): void;
    protected fireDocumentUpdate(changed: URI[], deleted: URI[]): void;
    didChangeContent(change: TextDocumentChangeEvent<TextDocument>): void;
    didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;
}
//# sourceMappingURL=document-update-handler.d.ts.map