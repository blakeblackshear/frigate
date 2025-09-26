/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { DidChangeWatchedFilesNotification, FileChangeType } from 'vscode-languageserver';
import { stream } from '../utils/stream.js';
import { URI } from '../utils/uri-utils.js';
export class DefaultDocumentUpdateHandler {
    constructor(services) {
        this.workspaceManager = services.workspace.WorkspaceManager;
        this.documentBuilder = services.workspace.DocumentBuilder;
        this.workspaceLock = services.workspace.WorkspaceLock;
        this.serviceRegistry = services.ServiceRegistry;
        let canRegisterFileWatcher = false;
        services.lsp.LanguageServer.onInitialize(params => {
            var _a, _b;
            canRegisterFileWatcher = Boolean((_b = (_a = params.capabilities.workspace) === null || _a === void 0 ? void 0 : _a.didChangeWatchedFiles) === null || _b === void 0 ? void 0 : _b.dynamicRegistration);
        });
        services.lsp.LanguageServer.onInitialized(_params => {
            if (canRegisterFileWatcher) {
                this.registerFileWatcher(services);
            }
        });
    }
    registerFileWatcher(services) {
        const fileExtensions = stream(services.ServiceRegistry.all)
            .flatMap(language => language.LanguageMetaData.fileExtensions)
            .map(ext => ext.startsWith('.') ? ext.substring(1) : ext)
            .distinct()
            .toArray();
        if (fileExtensions.length > 0) {
            const connection = services.lsp.Connection;
            const options = {
                watchers: [{
                        globPattern: fileExtensions.length === 1
                            ? `**/*.${fileExtensions[0]}`
                            : `**/*.{${fileExtensions.join(',')}}`
                    }]
            };
            connection === null || connection === void 0 ? void 0 : connection.client.register(DidChangeWatchedFilesNotification.type, options);
        }
    }
    fireDocumentUpdate(changed, deleted) {
        // Filter out URIs that do not have a service in the registry
        // Running the document builder update will fail for those URIs
        changed = changed.filter(uri => this.serviceRegistry.hasServices(uri));
        // Only fire the document update when the workspace manager is ready
        // Otherwise, we might miss the initial indexing of the workspace
        this.workspaceManager.ready.then(() => {
            this.workspaceLock.write(token => this.documentBuilder.update(changed, deleted, token));
        }).catch(err => {
            // This should never happen, but if it does, we want to know about it
            console.error('Workspace initialization failed. Could not perform document update.', err);
        });
    }
    didChangeContent(change) {
        this.fireDocumentUpdate([URI.parse(change.document.uri)], []);
    }
    didChangeWatchedFiles(params) {
        const changedUris = stream(params.changes)
            .filter(c => c.type !== FileChangeType.Deleted)
            .distinct(c => c.uri)
            .map(c => URI.parse(c.uri))
            .toArray();
        const deletedUris = stream(params.changes)
            .filter(c => c.type === FileChangeType.Deleted)
            .distinct(c => c.uri)
            .map(c => URI.parse(c.uri))
            .toArray();
        this.fireDocumentUpdate(changedUris, deletedUris);
    }
}
//# sourceMappingURL=document-update-handler.js.map