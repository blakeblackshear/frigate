/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Connection, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent, RequestHandler, TextEdit, Event } from 'vscode-languageserver';
import { Disposable } from 'vscode-languageserver';
import type { URI } from '../utils/uri-utils.js';
/**
 * A manager service that keeps track of all currently opened text documents.
 *
 * Designed to be compatible with the `TextDocuments` class in the `vscode-languageserver` package.
 */
export interface TextDocuments<T extends {
    uri: string;
}> {
    /**
     * An event that fires when a text document managed by this manager
     * has been opened.
     */
    readonly onDidOpen: Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * has been opened or the content changes.
     */
    readonly onDidChangeContent: Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * will be saved.
     */
    readonly onWillSave: Event<TextDocumentWillSaveEvent<T>>;
    /**
     * Sets a handler that will be called if a participant wants to provide
     * edits during a text document save.
     */
    onWillSaveWaitUntil(handler: RequestHandler<TextDocumentWillSaveEvent<T>, TextEdit[], void>): void;
    /**
     * An event that fires when a text document managed by this manager
     * has been saved.
     */
    readonly onDidSave: Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * has been closed.
     */
    readonly onDidClose: Event<TextDocumentChangeEvent<T>>;
    /**
     * Returns the document for the given URI. Returns undefined if
     * the document is not managed by this instance.
     *
     * @param uri The text document's URI to retrieve.
     * @return the text document or `undefined`.
     */
    get(uri: string | URI): T | undefined;
    /**
     * Sets the text document managed by this instance.
     * @param document The text document to add.
     * @returns `true` if the document didn't exist yet, `false` if it was already present.
     */
    set(document: T): boolean;
    /**
     * Deletes a text document managed by this instance.
     */
    delete(uri: string | URI | T): void;
    /**
     * Returns all text documents managed by this instance.
     *
     * @return all text documents.
     */
    all(): T[];
    /**
     * Returns the URIs of all text documents managed by this instance.
     *
     * @return the URI's of all text documents.
     */
    keys(): string[];
    /**
     * Listens for `low level` notification on the given connection to
     * update the text documents managed by this instance.
     *
     * Please note that the connection only provides handlers not an event model. Therefore
     * listening on a connection will overwrite the following handlers on a connection:
     * `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument`,
     * `onWillSaveTextDocument`, `onWillSaveTextDocumentWaitUntil` and `onDidSaveTextDocument`.
     *
     * Use the corresponding events on the TextDocuments instance instead.
     *
     * @param connection The connection to listen on.
     */
    listen(connection: Connection): Disposable;
}
/**
 * Normalizing text document manager. Normalizes all incoming URIs to the same format used by VS Code.
 */
export declare class NormalizedTextDocuments<T extends {
    uri: string;
}> implements TextDocuments<T> {
    private readonly _configuration;
    private readonly _syncedDocuments;
    private readonly _onDidChangeContent;
    private readonly _onDidOpen;
    private readonly _onDidClose;
    private readonly _onDidSave;
    private readonly _onWillSave;
    private _willSaveWaitUntil;
    constructor(configuration: TextDocumentsConfiguration<T>);
    get onDidOpen(): Event<TextDocumentChangeEvent<T>>;
    get onDidChangeContent(): Event<TextDocumentChangeEvent<T>>;
    get onWillSave(): Event<TextDocumentWillSaveEvent<T>>;
    onWillSaveWaitUntil(handler: RequestHandler<TextDocumentWillSaveEvent<T>, TextEdit[], void>): void;
    get onDidSave(): Event<TextDocumentChangeEvent<T>>;
    get onDidClose(): Event<TextDocumentChangeEvent<T>>;
    get(uri: string | URI): T | undefined;
    set(document: T): boolean;
    delete(uri: string | T | URI): void;
    all(): T[];
    keys(): string[];
    listen(connection: Connection): Disposable;
}
//# sourceMappingURL=normalized-text-documents.d.ts.map