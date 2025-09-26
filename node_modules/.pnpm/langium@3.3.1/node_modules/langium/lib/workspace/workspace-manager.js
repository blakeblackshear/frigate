/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { Deferred, interruptAndCheck } from '../utils/promise-utils.js';
import { URI, UriUtils } from '../utils/uri-utils.js';
export class DefaultWorkspaceManager {
    constructor(services) {
        this.initialBuildOptions = {};
        this._ready = new Deferred();
        this.serviceRegistry = services.ServiceRegistry;
        this.langiumDocuments = services.workspace.LangiumDocuments;
        this.documentBuilder = services.workspace.DocumentBuilder;
        this.fileSystemProvider = services.workspace.FileSystemProvider;
        this.mutex = services.workspace.WorkspaceLock;
    }
    get ready() {
        return this._ready.promise;
    }
    get workspaceFolders() {
        return this.folders;
    }
    initialize(params) {
        var _a;
        this.folders = (_a = params.workspaceFolders) !== null && _a !== void 0 ? _a : undefined;
    }
    initialized(_params) {
        // Initialize the workspace even if there are no workspace folders
        // We still want to load additional documents (language library or similar) during initialization
        return this.mutex.write(token => { var _a; return this.initializeWorkspace((_a = this.folders) !== null && _a !== void 0 ? _a : [], token); });
    }
    async initializeWorkspace(folders, cancelToken = CancellationToken.None) {
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
    async performStartup(folders) {
        const fileExtensions = this.serviceRegistry.all.flatMap(e => e.LanguageMetaData.fileExtensions);
        const documents = [];
        const collector = (document) => {
            documents.push(document);
            if (!this.langiumDocuments.hasDocument(document.uri)) {
                this.langiumDocuments.addDocument(document);
            }
        };
        // Even though we don't await the initialization of the workspace manager,
        // we can still assume that all library documents and file documents are loaded by the time we start building documents.
        // The mutex prevents anything from performing a workspace build until we check the cancellation token
        await this.loadAdditionalDocuments(folders, collector);
        await Promise.all(folders.map(wf => [wf, this.getRootFolder(wf)])
            .map(async (entry) => this.traverseFolder(...entry, fileExtensions, collector)));
        this._ready.resolve();
        return documents;
    }
    /**
     * Load all additional documents that shall be visible in the context of the given workspace
     * folders and add them to the collector. This can be used to include built-in libraries of
     * your language, which can be either loaded from provided files or constructed in memory.
     */
    loadAdditionalDocuments(_folders, _collector) {
        return Promise.resolve();
    }
    /**
     * Determine the root folder of the source documents in the given workspace folder.
     * The default implementation returns the URI of the workspace folder, but you can override
     * this to return a subfolder like `src` instead.
     */
    getRootFolder(workspaceFolder) {
        return URI.parse(workspaceFolder.uri);
    }
    /**
     * Traverse the file system folder identified by the given URI and its subfolders. All
     * contained files that match the file extensions are added to the collector.
     */
    async traverseFolder(workspaceFolder, folderPath, fileExtensions, collector) {
        const content = await this.fileSystemProvider.readDirectory(folderPath);
        await Promise.all(content.map(async (entry) => {
            if (this.includeEntry(workspaceFolder, entry, fileExtensions)) {
                if (entry.isDirectory) {
                    await this.traverseFolder(workspaceFolder, entry.uri, fileExtensions, collector);
                }
                else if (entry.isFile) {
                    const document = await this.langiumDocuments.getOrCreateDocument(entry.uri);
                    collector(document);
                }
            }
        }));
    }
    /**
     * Determine whether the given folder entry shall be included while indexing the workspace.
     */
    includeEntry(_workspaceFolder, entry, fileExtensions) {
        const name = UriUtils.basename(entry.uri);
        if (name.startsWith('.')) {
            return false;
        }
        if (entry.isDirectory) {
            return name !== 'node_modules' && name !== 'out';
        }
        else if (entry.isFile) {
            const extname = UriUtils.extname(entry.uri);
            return fileExtensions.includes(extname);
        }
        return false;
    }
}
//# sourceMappingURL=workspace-manager.js.map