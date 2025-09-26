import { NotificationHandler, DidOpenTextDocumentParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, WillSaveTextDocumentParams, RequestHandler, TextEdit, DidSaveTextDocumentParams, DocumentUri, TextDocumentContentChangeEvent, TextDocumentSaveReason, Event, TextDocumentSyncKind, Disposable } from 'vscode-languageserver-protocol';
/**
 * We should use a mapped type to create this from Connection.
 */
export interface TextDocumentConnection {
    onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): Disposable;
    onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): Disposable;
    onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): Disposable;
    onWillSaveTextDocument(handler: NotificationHandler<WillSaveTextDocumentParams>): Disposable;
    onWillSaveTextDocumentWaitUntil(handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[] | undefined | null, void>): Disposable;
    onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): Disposable;
}
export interface ConnectionState {
    __textDocumentSync: TextDocumentSyncKind | undefined;
}
export interface TextDocumentsConfiguration<T extends {
    uri: DocumentUri;
}> {
    create(uri: DocumentUri, languageId: string, version: number, content: string): T;
    update(document: T, changes: TextDocumentContentChangeEvent[], version: number): T;
}
/**
 * Event to signal changes to a text document.
 */
export interface TextDocumentChangeEvent<T> {
    /**
     * The document that has changed.
     */
    document: T;
}
/**
 * Event to signal that a document will be saved.
 */
export interface TextDocumentWillSaveEvent<T> {
    /**
     * The document that will be saved
     */
    document: T;
    /**
     * The reason why save was triggered.
     */
    reason: TextDocumentSaveReason;
}
/**
 * A manager for simple text documents. The manager requires at a minimum that
 * the server registered for the following text document sync events in the
 * initialize handler or via dynamic registration:
 *
 * - open and close events.
 * - change events.
 *
 * Registering for save and will save events is optional.
 */
export declare class TextDocuments<T extends {
    uri: DocumentUri;
}> {
    private readonly _configuration;
    private readonly _syncedDocuments;
    private readonly _onDidChangeContent;
    private readonly _onDidOpen;
    private readonly _onDidClose;
    private readonly _onDidSave;
    private readonly _onWillSave;
    private _willSaveWaitUntil;
    /**
     * Create a new text document manager.
     */
    constructor(configuration: TextDocumentsConfiguration<T>);
    /**
     * An event that fires when a text document managed by this manager
     * has been opened.
     */
    get onDidOpen(): Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * has been opened or the content changes.
     */
    get onDidChangeContent(): Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * will be saved.
     */
    get onWillSave(): Event<TextDocumentWillSaveEvent<T>>;
    /**
     * Sets a handler that will be called if a participant wants to provide
     * edits during a text document save.
     */
    onWillSaveWaitUntil(handler: RequestHandler<TextDocumentWillSaveEvent<T>, TextEdit[], void>): void;
    /**
     * An event that fires when a text document managed by this manager
     * has been saved.
     */
    get onDidSave(): Event<TextDocumentChangeEvent<T>>;
    /**
     * An event that fires when a text document managed by this manager
     * has been closed.
     */
    get onDidClose(): Event<TextDocumentChangeEvent<T>>;
    /**
     * Returns the document for the given URI. Returns undefined if
     * the document is not managed by this instance.
     *
     * @param uri The text document's URI to retrieve.
     * @return the text document or `undefined`.
     */
    get(uri: string): T | undefined;
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
    listen(connection: TextDocumentConnection): Disposable;
}
