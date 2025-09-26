/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { InitializeParams, InitializedParams } from 'vscode-languageserver-protocol';
import type { WorkspaceFolder } from 'vscode-languageserver-types';
import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import { CancellationToken } from '../utils/cancellation.js';
import { Deferred, interruptAndCheck } from '../utils/promise-utils.js';
import { URI, UriUtils } from '../utils/uri-utils.js';
import type { BuildOptions, DocumentBuilder } from './document-builder.js';
import type { LangiumDocument, LangiumDocuments } from './documents.js';
import type { FileSystemNode, FileSystemProvider } from './file-system-provider.js';
import type { WorkspaceLock } from './workspace-lock.js';

// export type WorkspaceFolder from 'vscode-languageserver-types' for convenience,
//  is supposed to avoid confusion as 'WorkspaceFolder' might accidentally be imported via 'vscode-languageclient'
export type { WorkspaceFolder };

/**
 * The workspace manager is responsible for finding source files in the workspace.
 * This service is shared between all languages of a language server.
 */
export interface WorkspaceManager {

    /** The options used for the initial workspace build. */
    initialBuildOptions: BuildOptions | undefined;

    /**
     * A promise that resolves when the workspace manager is ready to be used.
     * Use this to ensure that the workspace manager has finished its initialization.
     */
    readonly ready: Promise<void>;

    /**
     * The workspace folders of the current workspace.
     * Available only after the `ready` promise resolves.
     */
    get workspaceFolders(): readonly WorkspaceFolder[] | undefined;

    /**
     * When used in a language server context, this method is called when the server receives
     * the `initialize` request.
     */
    initialize(params: InitializeParams): void;

    /**
     * When used in a language server context, this method is called when the server receives
     * the `initialized` notification.
     */
    initialized(params: InitializedParams): Promise<void>;

    /**
     * Does the initial indexing of workspace folders.
     * Collects information about exported and referenced AstNodes in
     * each language file and stores it locally.
     *
     * @param folders The set of workspace folders to be indexed.
     * @param cancelToken A cancellation token that can be used to cancel the operation.
     *
     * @throws OperationCancelled if a cancellation event has been detected
     */
    initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken): Promise<void>;

}

export class DefaultWorkspaceManager implements WorkspaceManager {

    initialBuildOptions: BuildOptions = {};

    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly documentBuilder: DocumentBuilder;
    protected readonly fileSystemProvider: FileSystemProvider;
    protected readonly mutex: WorkspaceLock;
    protected readonly _ready = new Deferred<void>();
    protected folders?: WorkspaceFolder[];

    constructor(services: LangiumSharedCoreServices) {
        this.serviceRegistry = services.ServiceRegistry;
        this.langiumDocuments = services.workspace.LangiumDocuments;
        this.documentBuilder = services.workspace.DocumentBuilder;
        this.fileSystemProvider = services.workspace.FileSystemProvider;
        this.mutex = services.workspace.WorkspaceLock;
    }

    get ready(): Promise<void> {
        return this._ready.promise;
    }

    get workspaceFolders(): readonly WorkspaceFolder[] | undefined {
        return this.folders;
    }

    initialize(params: InitializeParams): void {
        this.folders = params.workspaceFolders ?? undefined;
    }

    initialized(_params: InitializedParams): Promise<void> {
        // Initialize the workspace even if there are no workspace folders
        // We still want to load additional documents (language library or similar) during initialization
        return this.mutex.write(token => this.initializeWorkspace(this.folders ?? [], token));
    }

    async initializeWorkspace(folders: WorkspaceFolder[], cancelToken = CancellationToken.None): Promise<void> {
        const documents = await this.performStartup(folders);
        // Only after creating all documents do we check whether we need to cancel the initialization
        // The document builder will later pick up on all unprocessed documents
        await interruptAndCheck(cancelToken);
        await this.documentBuilder.build(documents, this.initialBuildOptions, cancelToken);
    }

    /**
     * Performs the uninterruptable startup sequence of the workspace manager.
     * This methods loads all documents in the workspace and other documents and returns them.
     */
    protected async performStartup(folders: WorkspaceFolder[]): Promise<LangiumDocument[]> {
        const fileExtensions = this.serviceRegistry.all.flatMap(e => e.LanguageMetaData.fileExtensions);
        const documents: LangiumDocument[] = [];
        const collector = (document: LangiumDocument) => {
            documents.push(document);
            if (!this.langiumDocuments.hasDocument(document.uri)) {
                this.langiumDocuments.addDocument(document);
            }
        };
        // Even though we don't await the initialization of the workspace manager,
        // we can still assume that all library documents and file documents are loaded by the time we start building documents.
        // The mutex prevents anything from performing a workspace build until we check the cancellation token
        await this.loadAdditionalDocuments(folders, collector);
        await Promise.all(
            folders.map(wf => [wf, this.getRootFolder(wf)] as [WorkspaceFolder, URI])
                .map(async entry => this.traverseFolder(...entry, fileExtensions, collector))
        );
        this._ready.resolve();
        return documents;
    }

    /**
     * Load all additional documents that shall be visible in the context of the given workspace
     * folders and add them to the collector. This can be used to include built-in libraries of
     * your language, which can be either loaded from provided files or constructed in memory.
     */
    protected loadAdditionalDocuments(_folders: WorkspaceFolder[], _collector: (document: LangiumDocument) => void): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Determine the root folder of the source documents in the given workspace folder.
     * The default implementation returns the URI of the workspace folder, but you can override
     * this to return a subfolder like `src` instead.
     */
    protected getRootFolder(workspaceFolder: WorkspaceFolder): URI {
        return URI.parse(workspaceFolder.uri);
    }

    /**
     * Traverse the file system folder identified by the given URI and its subfolders. All
     * contained files that match the file extensions are added to the collector.
     */
    protected async traverseFolder(workspaceFolder: WorkspaceFolder, folderPath: URI, fileExtensions: string[], collector: (document: LangiumDocument) => void): Promise<void> {
        const content = await this.fileSystemProvider.readDirectory(folderPath);
        await Promise.all(content.map(async entry => {
            if (this.includeEntry(workspaceFolder, entry, fileExtensions)) {
                if (entry.isDirectory) {
                    await this.traverseFolder(workspaceFolder, entry.uri, fileExtensions, collector);
                } else if (entry.isFile) {
                    const document = await this.langiumDocuments.getOrCreateDocument(entry.uri);
                    collector(document);
                }
            }
        }));
    }

    /**
     * Determine whether the given folder entry shall be included while indexing the workspace.
     */
    protected includeEntry(_workspaceFolder: WorkspaceFolder, entry: FileSystemNode, fileExtensions: string[]): boolean {
        const name = UriUtils.basename(entry.uri);
        if (name.startsWith('.')) {
            return false;
        }
        if (entry.isDirectory) {
            return name !== 'node_modules' && name !== 'out';
        } else if (entry.isFile) {
            const extname = UriUtils.extname(entry.uri);
            return fileExtensions.includes(extname);
        }
        return false;
    }

}
