import { NotificationHandler1, Event, DocumentUri, URI, Disposable, DidOpenNotebookDocumentParams, DidChangeNotebookDocumentParams, DidSaveNotebookDocumentParams, DidCloseNotebookDocumentParams, NotebookDocument, NotebookCell, LSPObject } from 'vscode-languageserver-protocol';
import type { Feature, _Notebooks, Connection } from './server';
import { TextDocuments, TextDocumentsConfiguration } from './textDocuments';
/**
 * Shape of the notebooks feature
 *
 * @since 3.17.0
 */
export interface NotebookSyncFeatureShape {
    synchronization: {
        onDidOpenNotebookDocument(handler: NotificationHandler1<DidOpenNotebookDocumentParams>): Disposable;
        onDidChangeNotebookDocument(handler: NotificationHandler1<DidChangeNotebookDocumentParams>): Disposable;
        onDidSaveNotebookDocument(handler: NotificationHandler1<DidSaveNotebookDocumentParams>): Disposable;
        onDidCloseNotebookDocument(handler: NotificationHandler1<DidCloseNotebookDocumentParams>): Disposable;
    };
}
export declare const NotebookSyncFeature: Feature<_Notebooks, NotebookSyncFeatureShape>;
export type NotebookDocumentChangeEvent = {
    /**
     * The notebook document that changed.
     */
    notebookDocument: NotebookDocument;
    /**
     * The meta data change if any.
     *
     * Note: old and new should always be an object literal (e.g. LSPObject)
     */
    metadata?: {
        old: LSPObject | undefined;
        new: LSPObject | undefined;
    };
    /**
     * The cell changes if any.
     */
    cells?: {
        /**
         * The cells that got added.
         */
        added: NotebookCell[];
        /**
         * The cells that got removed.
         */
        removed: NotebookCell[];
        /**
         * The cells that changed.
         */
        changed: {
            /**
             * The cell data has changed, excluding its
             * text content which is reported via
             * `textContentChanged`.
             */
            data: {
                old: NotebookCell;
                new: NotebookCell;
            }[];
            /**
             * The text content of a cell has changed.
             * The actual text is available via the `Notebooks`
             * text document manager.
             */
            textContent: NotebookCell[];
        };
    };
};
export declare class NotebookDocuments<T extends {
    uri: DocumentUri;
}> {
    private readonly notebookDocuments;
    private readonly notebookCellMap;
    private readonly _onDidOpen;
    private readonly _onDidSave;
    private readonly _onDidChange;
    private readonly _onDidClose;
    private _cellTextDocuments;
    constructor(configurationOrTextDocuments: TextDocumentsConfiguration<T> | TextDocuments<T>);
    get cellTextDocuments(): TextDocuments<T>;
    getCellTextDocument(cell: NotebookCell): T | undefined;
    getNotebookDocument(uri: URI): NotebookDocument | undefined;
    getNotebookCell(uri: DocumentUri): NotebookCell | undefined;
    findNotebookDocumentForCell(cell: DocumentUri | NotebookCell): NotebookDocument | undefined;
    get onDidOpen(): Event<NotebookDocument>;
    get onDidSave(): Event<NotebookDocument>;
    get onDidChange(): Event<NotebookDocumentChangeEvent>;
    get onDidClose(): Event<NotebookDocument>;
    /**
     * Listens for `low level` notification on the given connection to
     * update the notebook documents managed by this instance.
     *
     * Please note that the connection only provides handlers not an event model. Therefore
     * listening on a connection will overwrite the following handlers on a connection:
     * `onDidOpenNotebookDocument`, `onDidChangeNotebookDocument`, `onDidSaveNotebookDocument`,
     *  and `onDidCloseNotebookDocument`.
     *
     * @param connection The connection to listen on.
     */
    listen(connection: Connection): Disposable;
    private updateCellMap;
}
