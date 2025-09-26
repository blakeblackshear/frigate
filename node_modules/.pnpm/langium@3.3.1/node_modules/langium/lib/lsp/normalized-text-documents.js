/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { TextDocumentSyncKind, Disposable, Emitter } from 'vscode-languageserver';
import { UriUtils } from '../utils/uri-utils.js';
// Adapted from:
// https://github.com/microsoft/vscode-languageserver-node/blob/8f5fa710d3a9f60ff5e7583a9e61b19f86e39da3/server/src/common/textDocuments.ts
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/**
 * Normalizing text document manager. Normalizes all incoming URIs to the same format used by VS Code.
 */
export class NormalizedTextDocuments {
    constructor(configuration) {
        this._configuration = configuration;
        this._syncedDocuments = new Map();
        this._onDidChangeContent = new Emitter();
        this._onDidOpen = new Emitter();
        this._onDidClose = new Emitter();
        this._onDidSave = new Emitter();
        this._onWillSave = new Emitter();
    }
    get onDidOpen() {
        return this._onDidOpen.event;
    }
    get onDidChangeContent() {
        return this._onDidChangeContent.event;
    }
    get onWillSave() {
        return this._onWillSave.event;
    }
    onWillSaveWaitUntil(handler) {
        this._willSaveWaitUntil = handler;
    }
    get onDidSave() {
        return this._onDidSave.event;
    }
    get onDidClose() {
        return this._onDidClose.event;
    }
    get(uri) {
        return this._syncedDocuments.get(UriUtils.normalize(uri));
    }
    set(document) {
        const uri = UriUtils.normalize(document.uri);
        let result = true;
        if (this._syncedDocuments.has(uri)) {
            result = false;
        }
        this._syncedDocuments.set(uri, document);
        const toFire = Object.freeze({ document });
        this._onDidOpen.fire(toFire);
        this._onDidChangeContent.fire(toFire);
        return result;
    }
    delete(uri) {
        const uriString = UriUtils.normalize(typeof uri === 'object' && 'uri' in uri ? uri.uri : uri);
        const syncedDocument = this._syncedDocuments.get(uriString);
        if (syncedDocument !== undefined) {
            this._syncedDocuments.delete(uriString);
            this._onDidClose.fire(Object.freeze({ document: syncedDocument }));
        }
    }
    all() {
        return Array.from(this._syncedDocuments.values());
    }
    keys() {
        return Array.from(this._syncedDocuments.keys());
    }
    listen(connection) {
        // Required for interoperability with the the vscode-languageserver package
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.__textDocumentSync = TextDocumentSyncKind.Incremental;
        const disposables = [];
        disposables.push(connection.onDidOpenTextDocument((event) => {
            const td = event.textDocument;
            const uri = UriUtils.normalize(td.uri);
            const document = this._configuration.create(uri, td.languageId, td.version, td.text);
            this._syncedDocuments.set(uri, document);
            const toFire = Object.freeze({ document });
            this._onDidOpen.fire(toFire);
            this._onDidChangeContent.fire(toFire);
        }));
        disposables.push(connection.onDidChangeTextDocument((event) => {
            const td = event.textDocument;
            const changes = event.contentChanges;
            if (changes.length === 0) {
                return;
            }
            const { version } = td;
            if (version === null || version === undefined) {
                throw new Error(`Received document change event for ${td.uri} without valid version identifier`);
            }
            const uri = UriUtils.normalize(td.uri);
            let syncedDocument = this._syncedDocuments.get(uri);
            if (syncedDocument !== undefined) {
                syncedDocument = this._configuration.update(syncedDocument, changes, version);
                this._syncedDocuments.set(uri, syncedDocument);
                this._onDidChangeContent.fire(Object.freeze({ document: syncedDocument }));
            }
        }));
        disposables.push(connection.onDidCloseTextDocument((event) => {
            const uri = UriUtils.normalize(event.textDocument.uri);
            const syncedDocument = this._syncedDocuments.get(uri);
            if (syncedDocument !== undefined) {
                this._syncedDocuments.delete(uri);
                this._onDidClose.fire(Object.freeze({ document: syncedDocument }));
            }
        }));
        disposables.push(connection.onWillSaveTextDocument((event) => {
            const syncedDocument = this._syncedDocuments.get(UriUtils.normalize(event.textDocument.uri));
            if (syncedDocument !== undefined) {
                this._onWillSave.fire(Object.freeze({ document: syncedDocument, reason: event.reason }));
            }
        }));
        disposables.push(connection.onWillSaveTextDocumentWaitUntil((event, token) => {
            const syncedDocument = this._syncedDocuments.get(UriUtils.normalize(event.textDocument.uri));
            if (syncedDocument !== undefined && this._willSaveWaitUntil) {
                return this._willSaveWaitUntil(Object.freeze({ document: syncedDocument, reason: event.reason }), token);
            }
            else {
                return [];
            }
        }));
        disposables.push(connection.onDidSaveTextDocument((event) => {
            const syncedDocument = this._syncedDocuments.get(UriUtils.normalize(event.textDocument.uri));
            if (syncedDocument !== undefined) {
                this._onDidSave.fire(Object.freeze({ document: syncedDocument }));
            }
        }));
        return Disposable.create(() => { disposables.forEach(disposable => disposable.dispose()); });
    }
}
//# sourceMappingURL=normalized-text-documents.js.map