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
import { Deferred } from '../utils/promise-utils.js';
import { URI } from '../utils/uri-utils.js';
import type { BuildOptions, DocumentBuilder } from './document-builder.js';
import type { LangiumDocument, LangiumDocuments } from './documents.js';
import type { FileSystemNode, FileSystemProvider } from './file-system-provider.js';
import type { WorkspaceLock } from './workspace-lock.js';
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
export declare class DefaultWorkspaceManager implements WorkspaceManager {
    initialBuildOptions: BuildOptions;
    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly documentBuilder: DocumentBuilder;
    protected readonly fileSystemProvider: FileSystemProvider;
    protected readonly mutex: WorkspaceLock;
    protected readonly _ready: Deferred<void>;
    protected folders?: WorkspaceFolder[];
    constructor(services: LangiumSharedCoreServices);
    get ready(): Promise<void>;
    get workspaceFolders(): readonly WorkspaceFolder[] | undefined;
    initialize(params: InitializeParams): void;
    initialized(_params: InitializedParams): Promise<void>;
    initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken): Promise<void>;
    /**
     * Performs the uninterruptable startup sequence of the workspace manager.
     * This methods loads all documents in the workspace and other documents and returns them.
     */
    protected performStartup(folders: WorkspaceFolder[]): Promise<LangiumDocument[]>;
    /**
     * Load all additional documents that shall be visible in the context of the given workspace
     * folders and add them to the collector. This can be used to include built-in libraries of
     * your language, which can be either loaded from provided files or constructed in memory.
     */
    protected loadAdditionalDocuments(_folders: WorkspaceFolder[], _collector: (document: LangiumDocument) => void): Promise<void>;
    /**
     * Determine the root folder of the source documents in the given workspace folder.
     * The default implementation returns the URI of the workspace folder, but you can override
     * this to return a subfolder like `src` instead.
     */
    protected getRootFolder(workspaceFolder: WorkspaceFolder): URI;
    /**
     * Traverse the file system folder identified by the given URI and its subfolders. All
     * contained files that match the file extensions are added to the collector.
     */
    protected traverseFolder(workspaceFolder: WorkspaceFolder, folderPath: URI, fileExtensions: string[], collector: (document: LangiumDocument) => void): Promise<void>;
    /**
     * Determine whether the given folder entry shall be included while indexing the workspace.
     */
    protected includeEntry(_workspaceFolder: WorkspaceFolder, entry: FileSystemNode, fileExtensions: string[]): boolean;
}
//# sourceMappingURL=workspace-manager.d.ts.map