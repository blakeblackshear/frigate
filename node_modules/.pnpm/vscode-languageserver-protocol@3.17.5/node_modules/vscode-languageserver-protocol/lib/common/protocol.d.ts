import { ProgressToken, RequestHandler, TraceValues } from 'vscode-jsonrpc';
import { MessageDirection, ProtocolRequestType, ProtocolRequestType0, ProtocolNotificationType, ProtocolNotificationType0 } from './messages';
import { Position, Range, Location, LocationLink, Diagnostic, Command, TextEdit, WorkspaceEdit, DocumentUri, TextDocumentIdentifier, VersionedTextDocumentIdentifier, TextDocumentItem, CompletionItem, CompletionList, Hover, SignatureHelp, Definition, ReferenceContext, DocumentHighlight, SymbolInformation, CodeLens, CodeActionContext, FormattingOptions, DocumentLink, MarkupKind, SymbolKind, CompletionItemKind, CodeAction, CodeActionKind, DocumentSymbol, CompletionItemTag, DiagnosticTag, SymbolTag, uinteger, integer, InsertTextMode, LSPAny, WorkspaceSymbol, URI, WorkspaceFolder } from 'vscode-languageserver-types';
import { ImplementationRequest, ImplementationClientCapabilities, ImplementationOptions, ImplementationRegistrationOptions, ImplementationParams } from './protocol.implementation';
import { TypeDefinitionRequest, TypeDefinitionClientCapabilities, TypeDefinitionOptions, TypeDefinitionRegistrationOptions, TypeDefinitionParams } from './protocol.typeDefinition';
import { WorkspaceFoldersRequest, DidChangeWorkspaceFoldersNotification, DidChangeWorkspaceFoldersParams, WorkspaceFoldersChangeEvent, WorkspaceFoldersInitializeParams, WorkspaceFoldersServerCapabilities } from './protocol.workspaceFolder';
import { ConfigurationRequest, ConfigurationParams, ConfigurationItem } from './protocol.configuration';
import { DocumentColorRequest, ColorPresentationRequest, DocumentColorOptions, DocumentColorParams, ColorPresentationParams, DocumentColorClientCapabilities, DocumentColorRegistrationOptions } from './protocol.colorProvider';
import { FoldingRangeClientCapabilities, FoldingRangeOptions, FoldingRangeRequest, FoldingRangeParams, FoldingRangeRegistrationOptions, FoldingRangeRefreshRequest, FoldingRangeWorkspaceClientCapabilities } from './protocol.foldingRange';
import { DeclarationClientCapabilities, DeclarationRequest, DeclarationOptions, DeclarationRegistrationOptions, DeclarationParams } from './protocol.declaration';
import { SelectionRangeClientCapabilities, SelectionRangeOptions, SelectionRangeRequest, SelectionRangeParams, SelectionRangeRegistrationOptions } from './protocol.selectionRange';
import { WorkDoneProgressBegin, WorkDoneProgressReport, WorkDoneProgressEnd, WorkDoneProgress, WorkDoneProgressCreateParams, WorkDoneProgressCreateRequest, WorkDoneProgressCancelParams, WorkDoneProgressCancelNotification } from './protocol.progress';
import { CallHierarchyClientCapabilities, CallHierarchyOptions, CallHierarchyRegistrationOptions, CallHierarchyIncomingCallsParams, CallHierarchyIncomingCallsRequest, CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCallsRequest, CallHierarchyPrepareParams, CallHierarchyPrepareRequest } from './protocol.callHierarchy';
import { SemanticTokensPartialResult, SemanticTokensDeltaPartialResult, TokenFormat, SemanticTokensClientCapabilities, SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensParams, SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest, SemanticTokensRefreshRequest, SemanticTokensWorkspaceClientCapabilities, SemanticTokensRegistrationType } from './protocol.semanticTokens';
import { ShowDocumentParams, ShowDocumentResult, ShowDocumentRequest, ShowDocumentClientCapabilities } from './protocol.showDocument';
import { LinkedEditingRangeClientCapabilities, LinkedEditingRanges, LinkedEditingRangeOptions, LinkedEditingRangeParams, LinkedEditingRangeRegistrationOptions, LinkedEditingRangeRequest } from './protocol.linkedEditingRange';
import { FileOperationOptions, FileOperationClientCapabilities, FileOperationRegistrationOptions, FileOperationPatternOptions, FileOperationPatternKind, DidCreateFilesNotification, CreateFilesParams, FileCreate, WillCreateFilesRequest, DidRenameFilesNotification, RenameFilesParams, FileRename, WillRenameFilesRequest, DidDeleteFilesNotification, DeleteFilesParams, FileDelete, WillDeleteFilesRequest } from './protocol.fileOperations';
import { UniquenessLevel, MonikerKind, Moniker, MonikerClientCapabilities, MonikerOptions, MonikerRegistrationOptions, MonikerParams, MonikerRequest } from './protocol.moniker';
import { TypeHierarchyClientCapabilities, TypeHierarchyOptions, TypeHierarchyRegistrationOptions, TypeHierarchyPrepareParams, TypeHierarchyPrepareRequest, TypeHierarchySubtypesParams, TypeHierarchySubtypesRequest, TypeHierarchySupertypesParams, TypeHierarchySupertypesRequest } from './protocol.typeHierarchy';
import { InlineValueClientCapabilities, InlineValueOptions, InlineValueRegistrationOptions, InlineValueWorkspaceClientCapabilities, InlineValueParams, InlineValueRequest, InlineValueRefreshRequest } from './protocol.inlineValue';
import { InlayHintClientCapabilities, InlayHintOptions, InlayHintRegistrationOptions, InlayHintWorkspaceClientCapabilities, InlayHintParams, InlayHintRequest, InlayHintResolveRequest, InlayHintRefreshRequest } from './protocol.inlayHint';
import { DiagnosticClientCapabilities, DiagnosticOptions, DiagnosticRegistrationOptions, DiagnosticServerCancellationData, DocumentDiagnosticParams, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport, RelatedFullDocumentDiagnosticReport, UnchangedDocumentDiagnosticReport, RelatedUnchangedDocumentDiagnosticReport, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DocumentDiagnosticRequest, PreviousResultId, WorkspaceDiagnosticParams, WorkspaceFullDocumentDiagnosticReport, WorkspaceUnchangedDocumentDiagnosticReport, WorkspaceDocumentDiagnosticReport, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, WorkspaceDiagnosticRequest, DiagnosticRefreshRequest, DiagnosticWorkspaceClientCapabilities } from './protocol.diagnostic';
import { NotebookDocumentSyncClientCapabilities, NotebookCellKind, ExecutionSummary, NotebookCell, NotebookDocument, NotebookDocumentIdentifier, VersionedNotebookDocumentIdentifier, NotebookDocumentSyncOptions, NotebookDocumentSyncRegistrationOptions, NotebookDocumentSyncRegistrationType, DidOpenNotebookDocumentParams, DidOpenNotebookDocumentNotification, NotebookCellArrayChange, NotebookDocumentChangeEvent, DidChangeNotebookDocumentParams, DidChangeNotebookDocumentNotification, DidSaveNotebookDocumentParams, DidSaveNotebookDocumentNotification, DidCloseNotebookDocumentParams, DidCloseNotebookDocumentNotification } from './protocol.notebook';
import { InlineCompletionClientCapabilities, InlineCompletionOptions, InlineCompletionParams, InlineCompletionRegistrationOptions, InlineCompletionRequest } from './protocol.inlineCompletion';
/**
 * A document filter denotes a document by different properties like
 * the {@link TextDocument.languageId language}, the {@link Uri.scheme scheme} of
 * its resource, or a glob-pattern that is applied to the {@link TextDocument.fileName path}.
 *
 * Glob patterns can have the following syntax:
 * - `*` to match one or more characters in a path segment
 * - `?` to match on one character in a path segment
 * - `**` to match any number of path segments, including none
 * - `{}` to group sub patterns into an OR expression. (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
 *
 * @sample A language filter that applies to typescript files on disk: `{ language: 'typescript', scheme: 'file' }`
 * @sample A language filter that applies to all package.json paths: `{ language: 'json', pattern: '**package.json' }`
 *
 * @since 3.17.0
 */
export type TextDocumentFilter = {
    /** A language id, like `typescript`. */
    language: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`. */
    scheme?: string;
    /** A glob pattern, like **​/*.{ts,js}. See TextDocumentFilter for examples. */
    pattern?: string;
} | {
    /** A language id, like `typescript`. */
    language?: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`. */
    scheme: string;
    /** A glob pattern, like **​/*.{ts,js}. See TextDocumentFilter for examples. */
    pattern?: string;
} | {
    /** A language id, like `typescript`. */
    language?: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`. */
    scheme?: string;
    /** A glob pattern, like **​/*.{ts,js}. See TextDocumentFilter for examples. */
    pattern: string;
};
/**
 * The TextDocumentFilter namespace provides helper functions to work with
 * {@link TextDocumentFilter} literals.
 *
 * @since 3.17.0
 */
export declare namespace TextDocumentFilter {
    function is(value: any): value is TextDocumentFilter;
}
/**
 * A notebook document filter denotes a notebook document by
 * different properties. The properties will be match
 * against the notebook's URI (same as with documents)
 *
 * @since 3.17.0
 */
export type NotebookDocumentFilter = {
    /** The type of the enclosing notebook. */
    notebookType: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`. */
    scheme?: string;
    /** A glob pattern. */
    pattern?: string;
} | {
    /** The type of the enclosing notebook. */
    notebookType?: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`.*/
    scheme: string;
    /** A glob pattern. */
    pattern?: string;
} | {
    /** The type of the enclosing notebook. */
    notebookType?: string;
    /** A Uri {@link Uri.scheme scheme}, like `file` or `untitled`. */
    scheme?: string;
    /** A glob pattern. */
    pattern: string;
};
/**
 * The NotebookDocumentFilter namespace provides helper functions to work with
 * {@link NotebookDocumentFilter} literals.
 *
 * @since 3.17.0
 */
export declare namespace NotebookDocumentFilter {
    function is(value: any): value is NotebookDocumentFilter;
}
/**
 * A notebook cell text document filter denotes a cell text
 * document by different properties.
 *
 * @since 3.17.0
 */
export type NotebookCellTextDocumentFilter = {
    /**
     * A filter that matches against the notebook
     * containing the notebook cell. If a string
     * value is provided it matches against the
     * notebook type. '*' matches every notebook.
     */
    notebook: string | NotebookDocumentFilter;
    /**
     * A language id like `python`.
     *
     * Will be matched against the language id of the
     * notebook cell document. '*' matches every language.
     */
    language?: string;
};
/**
 * The NotebookCellTextDocumentFilter namespace provides helper functions to work with
 * {@link NotebookCellTextDocumentFilter} literals.
 *
 * @since 3.17.0
 */
export declare namespace NotebookCellTextDocumentFilter {
    function is(value: any): value is NotebookCellTextDocumentFilter;
}
/**
 * A document filter describes a top level text document or
 * a notebook cell document.
 *
 * @since 3.17.0 - proposed support for NotebookCellTextDocumentFilter.
 */
export type DocumentFilter = TextDocumentFilter | NotebookCellTextDocumentFilter;
/**
 * A document selector is the combination of one or many document filters.
 *
 * @sample `let sel:DocumentSelector = [{ language: 'typescript' }, { language: 'json', pattern: '**∕tsconfig.json' }]`;
 *
 * The use of a string as a document filter is deprecated @since 3.16.0.
 */
export type DocumentSelector = (string | DocumentFilter)[];
/**
 * The DocumentSelector namespace provides helper functions to work with
 * {@link DocumentSelector}s.
 */
export declare namespace DocumentSelector {
    function is(value: any[] | undefined | null): value is DocumentSelector;
}
/**
 * General parameters to register for a notification or to register a provider.
 */
export interface Registration {
    /**
     * The id used to register the request. The id can be used to deregister
     * the request again.
     */
    id: string;
    /**
     * The method / capability to register for.
     */
    method: string;
    /**
     * Options necessary for the registration.
     */
    registerOptions?: LSPAny;
}
export interface RegistrationParams {
    registrations: Registration[];
}
/**
 * The `client/registerCapability` request is sent from the server to the client to register a new capability
 * handler on the client side.
 */
export declare namespace RegistrationRequest {
    const method: 'client/registerCapability';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<RegistrationParams, void, never, void, void>;
    type HandlerSignature = RequestHandler<RegistrationParams, void, void>;
}
/**
 * General parameters to unregister a request or notification.
 */
export interface Unregistration {
    /**
     * The id used to unregister the request or notification. Usually an id
     * provided during the register request.
     */
    id: string;
    /**
     * The method to unregister for.
     */
    method: string;
}
export interface UnregistrationParams {
    unregisterations: Unregistration[];
}
/**
 * The `client/unregisterCapability` request is sent from the server to the client to unregister a previously registered capability
 * handler on the client side.
 */
export declare namespace UnregistrationRequest {
    const method: 'client/unregisterCapability';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<UnregistrationParams, void, never, void, void>;
    type HandlerSignature = RequestHandler<UnregistrationParams, void, void>;
}
export interface WorkDoneProgressParams {
    /**
     * An optional token that a server can use to report work done progress.
     */
    workDoneToken?: ProgressToken;
}
export interface PartialResultParams {
    /**
     * An optional token that a server can use to report partial results (e.g. streaming) to
     * the client.
     */
    partialResultToken?: ProgressToken;
}
/**
 * A parameter literal used in requests to pass a text document and a position inside that
 * document.
 */
export interface TextDocumentPositionParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The position inside the text document.
     */
    position: Position;
}
/**
 * The kind of resource operations supported by the client.
 */
export type ResourceOperationKind = 'create' | 'rename' | 'delete';
export declare namespace ResourceOperationKind {
    /**
     * Supports creating new files and folders.
     */
    const Create: ResourceOperationKind;
    /**
     * Supports renaming existing files and folders.
     */
    const Rename: ResourceOperationKind;
    /**
     * Supports deleting existing files and folders.
     */
    const Delete: ResourceOperationKind;
}
export type FailureHandlingKind = 'abort' | 'transactional' | 'undo' | 'textOnlyTransactional';
export declare namespace FailureHandlingKind {
    /**
     * Applying the workspace change is simply aborted if one of the changes provided
     * fails. All operations executed before the failing operation stay executed.
     */
    const Abort: FailureHandlingKind;
    /**
     * All operations are executed transactional. That means they either all
     * succeed or no changes at all are applied to the workspace.
     */
    const Transactional: FailureHandlingKind;
    /**
     * If the workspace edit contains only textual file changes they are executed transactional.
     * If resource changes (create, rename or delete file) are part of the change the failure
     * handling strategy is abort.
     */
    const TextOnlyTransactional: FailureHandlingKind;
    /**
     * The client tries to undo the operations already executed. But there is no
     * guarantee that this is succeeding.
     */
    const Undo: FailureHandlingKind;
}
/**
 * Workspace specific client capabilities.
 */
export interface WorkspaceClientCapabilities {
    /**
     * The client supports applying batch edits
     * to the workspace by supporting the request
     * 'workspace/applyEdit'
     */
    applyEdit?: boolean;
    /**
     * Capabilities specific to `WorkspaceEdit`s.
     */
    workspaceEdit?: WorkspaceEditClientCapabilities;
    /**
     * Capabilities specific to the `workspace/didChangeConfiguration` notification.
     */
    didChangeConfiguration?: DidChangeConfigurationClientCapabilities;
    /**
     * Capabilities specific to the `workspace/didChangeWatchedFiles` notification.
     */
    didChangeWatchedFiles?: DidChangeWatchedFilesClientCapabilities;
    /**
     * Capabilities specific to the `workspace/symbol` request.
     */
    symbol?: WorkspaceSymbolClientCapabilities;
    /**
     * Capabilities specific to the `workspace/executeCommand` request.
     */
    executeCommand?: ExecuteCommandClientCapabilities;
    /**
     * The client has support for workspace folders.
     *
     * @since 3.6.0
     */
    workspaceFolders?: boolean;
    /**
     * The client supports `workspace/configuration` requests.
     *
     * @since 3.6.0
     */
    configuration?: boolean;
    /**
     * Capabilities specific to the semantic token requests scoped to the
     * workspace.
     *
     * @since 3.16.0.
     */
    semanticTokens?: SemanticTokensWorkspaceClientCapabilities;
    /**
     * Capabilities specific to the code lens requests scoped to the
     * workspace.
     *
     * @since 3.16.0.
     */
    codeLens?: CodeLensWorkspaceClientCapabilities;
    /**
     * The client has support for file notifications/requests for user operations on files.
     *
     * Since 3.16.0
     */
    fileOperations?: FileOperationClientCapabilities;
    /**
     * Capabilities specific to the inline values requests scoped to the
     * workspace.
     *
     * @since 3.17.0.
     */
    inlineValue?: InlineValueWorkspaceClientCapabilities;
    /**
     * Capabilities specific to the inlay hint requests scoped to the
     * workspace.
     *
     * @since 3.17.0.
     */
    inlayHint?: InlayHintWorkspaceClientCapabilities;
    /**
     * Capabilities specific to the diagnostic requests scoped to the
     * workspace.
     *
     * @since 3.17.0.
     */
    diagnostics?: DiagnosticWorkspaceClientCapabilities;
    /**
     * Capabilities specific to the folding range requests scoped to the workspace.
     *
     * @since 3.18.0
     * @proposed
     */
    foldingRange?: FoldingRangeWorkspaceClientCapabilities;
}
/**
 * Text document specific client capabilities.
 */
export interface TextDocumentClientCapabilities {
    /**
     * Defines which synchronization capabilities the client supports.
     */
    synchronization?: TextDocumentSyncClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/completion` request.
     */
    completion?: CompletionClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/hover` request.
     */
    hover?: HoverClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/signatureHelp` request.
     */
    signatureHelp?: SignatureHelpClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/declaration` request.
     *
     * @since 3.14.0
     */
    declaration?: DeclarationClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/definition` request.
     */
    definition?: DefinitionClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/typeDefinition` request.
     *
     * @since 3.6.0
     */
    typeDefinition?: TypeDefinitionClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/implementation` request.
     *
     * @since 3.6.0
     */
    implementation?: ImplementationClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/references` request.
     */
    references?: ReferenceClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/documentHighlight` request.
     */
    documentHighlight?: DocumentHighlightClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/documentSymbol` request.
     */
    documentSymbol?: DocumentSymbolClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/codeAction` request.
     */
    codeAction?: CodeActionClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/codeLens` request.
     */
    codeLens?: CodeLensClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/documentLink` request.
     */
    documentLink?: DocumentLinkClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/documentColor` and the
     * `textDocument/colorPresentation` request.
     *
     * @since 3.6.0
     */
    colorProvider?: DocumentColorClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/formatting` request.
     */
    formatting?: DocumentFormattingClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/rangeFormatting` request.
     */
    rangeFormatting?: DocumentRangeFormattingClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/onTypeFormatting` request.
     */
    onTypeFormatting?: DocumentOnTypeFormattingClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/rename` request.
     */
    rename?: RenameClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/foldingRange` request.
     *
     * @since 3.10.0
     */
    foldingRange?: FoldingRangeClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/selectionRange` request.
     *
     * @since 3.15.0
     */
    selectionRange?: SelectionRangeClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/publishDiagnostics` notification.
     */
    publishDiagnostics?: PublishDiagnosticsClientCapabilities;
    /**
     * Capabilities specific to the various call hierarchy requests.
     *
     * @since 3.16.0
     */
    callHierarchy?: CallHierarchyClientCapabilities;
    /**
     * Capabilities specific to the various semantic token request.
     *
     * @since 3.16.0
     */
    semanticTokens?: SemanticTokensClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/linkedEditingRange` request.
     *
     * @since 3.16.0
     */
    linkedEditingRange?: LinkedEditingRangeClientCapabilities;
    /**
     * Client capabilities specific to the `textDocument/moniker` request.
     *
     * @since 3.16.0
     */
    moniker?: MonikerClientCapabilities;
    /**
     * Capabilities specific to the various type hierarchy requests.
     *
     * @since 3.17.0
     */
    typeHierarchy?: TypeHierarchyClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/inlineValue` request.
     *
     * @since 3.17.0
     */
    inlineValue?: InlineValueClientCapabilities;
    /**
     * Capabilities specific to the `textDocument/inlayHint` request.
     *
     * @since 3.17.0
     */
    inlayHint?: InlayHintClientCapabilities;
    /**
     * Capabilities specific to the diagnostic pull model.
     *
     * @since 3.17.0
     */
    diagnostic?: DiagnosticClientCapabilities;
    /**
     * Client capabilities specific to inline completions.
     *
     * @since 3.18.0
     * @proposed
     */
    inlineCompletion?: InlineCompletionClientCapabilities;
}
export interface WindowClientCapabilities {
    /**
     * It indicates whether the client supports server initiated
     * progress using the `window/workDoneProgress/create` request.
     *
     * The capability also controls Whether client supports handling
     * of progress notifications. If set servers are allowed to report a
     * `workDoneProgress` property in the request specific server
     * capabilities.
     *
     * @since 3.15.0
     */
    workDoneProgress?: boolean;
    /**
     * Capabilities specific to the showMessage request.
     *
     * @since 3.16.0
     */
    showMessage?: ShowMessageRequestClientCapabilities;
    /**
     * Capabilities specific to the showDocument request.
     *
     * @since 3.16.0
     */
    showDocument?: ShowDocumentClientCapabilities;
}
/**
 * Client capabilities specific to regular expressions.
 *
 * @since 3.16.0
 */
export interface RegularExpressionsClientCapabilities {
    /**
     * The engine's name.
     */
    engine: string;
    /**
     * The engine's version.
     */
    version?: string;
}
/**
 * Client capabilities specific to the used markdown parser.
 *
 * @since 3.16.0
 */
export interface MarkdownClientCapabilities {
    /**
     * The name of the parser.
     */
    parser: string;
    /**
     * The version of the parser.
     */
    version?: string;
    /**
     * A list of HTML tags that the client allows / supports in
     * Markdown.
     *
     * @since 3.17.0
     */
    allowedTags?: string[];
}
/**
 * A set of predefined position encoding kinds.
 *
 * @since 3.17.0
 */
export declare namespace PositionEncodingKind {
    /**
     * Character offsets count UTF-8 code units (e.g. bytes).
     */
    const UTF8: PositionEncodingKind;
    /**
     * Character offsets count UTF-16 code units.
     *
     * This is the default and must always be supported
     * by servers
     */
    const UTF16: PositionEncodingKind;
    /**
     * Character offsets count UTF-32 code units.
     *
     * Implementation note: these are the same as Unicode codepoints,
     * so this `PositionEncodingKind` may also be used for an
     * encoding-agnostic representation of character offsets.
     */
    const UTF32: PositionEncodingKind;
}
/**
 * A type indicating how positions are encoded,
 * specifically what column offsets mean.
 *
 * @since 3.17.0
 */
export type PositionEncodingKind = string;
/**
 * General client capabilities.
 *
 * @since 3.16.0
 */
export interface GeneralClientCapabilities {
    /**
     * Client capability that signals how the client
     * handles stale requests (e.g. a request
     * for which the client will not process the response
     * anymore since the information is outdated).
     *
     * @since 3.17.0
     */
    staleRequestSupport?: {
        /**
         * The client will actively cancel the request.
         */
        cancel: boolean;
        /**
         * The list of requests for which the client
         * will retry the request if it receives a
         * response with error code `ContentModified`
         */
        retryOnContentModified: string[];
    };
    /**
     * Client capabilities specific to regular expressions.
     *
     * @since 3.16.0
     */
    regularExpressions?: RegularExpressionsClientCapabilities;
    /**
     * Client capabilities specific to the client's markdown parser.
     *
     * @since 3.16.0
     */
    markdown?: MarkdownClientCapabilities;
    /**
     * The position encodings supported by the client. Client and server
     * have to agree on the same position encoding to ensure that offsets
     * (e.g. character position in a line) are interpreted the same on both
     * sides.
     *
     * To keep the protocol backwards compatible the following applies: if
     * the value 'utf-16' is missing from the array of position encodings
     * servers can assume that the client supports UTF-16. UTF-16 is
     * therefore a mandatory encoding.
     *
     * If omitted it defaults to ['utf-16'].
     *
     * Implementation considerations: since the conversion from one encoding
     * into another requires the content of the file / line the conversion
     * is best done where the file is read which is usually on the server
     * side.
     *
     * @since 3.17.0
     */
    positionEncodings?: PositionEncodingKind[];
}
/**
 * Capabilities specific to the notebook document support.
 *
 * @since 3.17.0
 */
export interface NotebookDocumentClientCapabilities {
    /**
     * Capabilities specific to notebook document synchronization
     *
     * @since 3.17.0
     */
    synchronization: NotebookDocumentSyncClientCapabilities;
}
/**
 * Defines the capabilities provided by the client.
 */
export interface ClientCapabilities {
    /**
     * Workspace specific client capabilities.
     */
    workspace?: WorkspaceClientCapabilities;
    /**
     * Text document specific client capabilities.
     */
    textDocument?: TextDocumentClientCapabilities;
    /**
     * Capabilities specific to the notebook document support.
     *
     * @since 3.17.0
     */
    notebookDocument?: NotebookDocumentClientCapabilities;
    /**
     * Window specific client capabilities.
     */
    window?: WindowClientCapabilities;
    /**
     * General client capabilities.
     *
     * @since 3.16.0
     */
    general?: GeneralClientCapabilities;
    /**
     * Experimental client capabilities.
     */
    experimental?: LSPAny;
}
/**
 * Static registration options to be returned in the initialize
 * request.
 */
export interface StaticRegistrationOptions {
    /**
     * The id used to register the request. The id can be used to deregister
     * the request again. See also Registration#id.
     */
    id?: string;
}
/**
 * The StaticRegistrationOptions namespace provides helper functions to work with
 * {@link StaticRegistrationOptions} literals.
 */
export declare namespace StaticRegistrationOptions {
    function hasId(value: object): value is {
        id: string;
    };
}
/**
 * General text document registration options.
 */
export interface TextDocumentRegistrationOptions {
    /**
     * A document selector to identify the scope of the registration. If set to null
     * the document selector provided on the client side will be used.
     */
    documentSelector: DocumentSelector | null;
}
/**
 * The TextDocumentRegistrationOptions namespace provides helper functions to work with
 * {@link TextDocumentRegistrationOptions} literals.
 */
export declare namespace TextDocumentRegistrationOptions {
    function is(value: any): value is TextDocumentRegistrationOptions;
}
/**
 * Save options.
 */
export interface SaveOptions {
    /**
     * The client is supposed to include the content on save.
     */
    includeText?: boolean;
}
export interface WorkDoneProgressOptions {
    workDoneProgress?: boolean;
}
/**
 * The WorkDoneProgressOptions namespace provides helper functions to work with
 * {@link WorkDoneProgressOptions} literals.
 */
export declare namespace WorkDoneProgressOptions {
    function is(value: any): value is WorkDoneProgressOptions;
    function hasWorkDoneProgress(value: any): value is {
        workDoneProgress: boolean;
    };
}
/**
 * Defines the capabilities provided by a language
 * server.
 */
export interface ServerCapabilities<T = LSPAny> {
    /**
     * The position encoding the server picked from the encodings offered
     * by the client via the client capability `general.positionEncodings`.
     *
     * If the client didn't provide any position encodings the only valid
     * value that a server can return is 'utf-16'.
     *
     * If omitted it defaults to 'utf-16'.
     *
     * @since 3.17.0
     */
    positionEncoding?: PositionEncodingKind;
    /**
     * Defines how text documents are synced. Is either a detailed structure
     * defining each notification or for backwards compatibility the
     * TextDocumentSyncKind number.
     */
    textDocumentSync?: TextDocumentSyncOptions | TextDocumentSyncKind;
    /**
     * Defines how notebook documents are synced.
     *
     * @since 3.17.0
     */
    notebookDocumentSync?: NotebookDocumentSyncOptions | NotebookDocumentSyncRegistrationOptions;
    /**
     * The server provides completion support.
     */
    completionProvider?: CompletionOptions;
    /**
     * The server provides hover support.
     */
    hoverProvider?: boolean | HoverOptions;
    /**
     * The server provides signature help support.
     */
    signatureHelpProvider?: SignatureHelpOptions;
    /**
     * The server provides Goto Declaration support.
     */
    declarationProvider?: boolean | DeclarationOptions | DeclarationRegistrationOptions;
    /**
     * The server provides goto definition support.
     */
    definitionProvider?: boolean | DefinitionOptions;
    /**
     * The server provides Goto Type Definition support.
     */
    typeDefinitionProvider?: boolean | TypeDefinitionOptions | TypeDefinitionRegistrationOptions;
    /**
     * The server provides Goto Implementation support.
     */
    implementationProvider?: boolean | ImplementationOptions | ImplementationRegistrationOptions;
    /**
     * The server provides find references support.
     */
    referencesProvider?: boolean | ReferenceOptions;
    /**
     * The server provides document highlight support.
     */
    documentHighlightProvider?: boolean | DocumentHighlightOptions;
    /**
     * The server provides document symbol support.
     */
    documentSymbolProvider?: boolean | DocumentSymbolOptions;
    /**
     * The server provides code actions. CodeActionOptions may only be
     * specified if the client states that it supports
     * `codeActionLiteralSupport` in its initial `initialize` request.
     */
    codeActionProvider?: boolean | CodeActionOptions;
    /**
     * The server provides code lens.
     */
    codeLensProvider?: CodeLensOptions;
    /**
     * The server provides document link support.
     */
    documentLinkProvider?: DocumentLinkOptions;
    /**
     * The server provides color provider support.
     */
    colorProvider?: boolean | DocumentColorOptions | DocumentColorRegistrationOptions;
    /**
     * The server provides workspace symbol support.
     */
    workspaceSymbolProvider?: boolean | WorkspaceSymbolOptions;
    /**
     * The server provides document formatting.
     */
    documentFormattingProvider?: boolean | DocumentFormattingOptions;
    /**
     * The server provides document range formatting.
     */
    documentRangeFormattingProvider?: boolean | DocumentRangeFormattingOptions;
    /**
     * The server provides document formatting on typing.
     */
    documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;
    /**
     * The server provides rename support. RenameOptions may only be
     * specified if the client states that it supports
     * `prepareSupport` in its initial `initialize` request.
     */
    renameProvider?: boolean | RenameOptions;
    /**
     * The server provides folding provider support.
     */
    foldingRangeProvider?: boolean | FoldingRangeOptions | FoldingRangeRegistrationOptions;
    /**
     * The server provides selection range support.
     */
    selectionRangeProvider?: boolean | SelectionRangeOptions | SelectionRangeRegistrationOptions;
    /**
     * The server provides execute command support.
     */
    executeCommandProvider?: ExecuteCommandOptions;
    /**
     * The server provides call hierarchy support.
     *
     * @since 3.16.0
     */
    callHierarchyProvider?: boolean | CallHierarchyOptions | CallHierarchyRegistrationOptions;
    /**
     * The server provides linked editing range support.
     *
     * @since 3.16.0
     */
    linkedEditingRangeProvider?: boolean | LinkedEditingRangeOptions | LinkedEditingRangeRegistrationOptions;
    /**
     * The server provides semantic tokens support.
     *
     * @since 3.16.0
     */
    semanticTokensProvider?: SemanticTokensOptions | SemanticTokensRegistrationOptions;
    /**
     * The server provides moniker support.
     *
     * @since 3.16.0
     */
    monikerProvider?: boolean | MonikerOptions | MonikerRegistrationOptions;
    /**
     * The server provides type hierarchy support.
     *
     * @since 3.17.0
     */
    typeHierarchyProvider?: boolean | TypeHierarchyOptions | TypeHierarchyRegistrationOptions;
    /**
     * The server provides inline values.
     *
     * @since 3.17.0
     */
    inlineValueProvider?: boolean | InlineValueOptions | InlineValueRegistrationOptions;
    /**
     * The server provides inlay hints.
     *
     * @since 3.17.0
     */
    inlayHintProvider?: boolean | InlayHintOptions | InlayHintRegistrationOptions;
    /**
     * The server has support for pull model diagnostics.
     *
     * @since 3.17.0
     */
    diagnosticProvider?: DiagnosticOptions | DiagnosticRegistrationOptions;
    /**
     * Inline completion options used during static registration.
     *
     * @since 3.18.0
     * @proposed
     */
    inlineCompletionProvider?: boolean | InlineCompletionOptions;
    /**
     * Workspace specific server capabilities.
     */
    workspace?: {
        /**
         * The server supports workspace folder.
         *
         * @since 3.6.0
         */
        workspaceFolders?: WorkspaceFoldersServerCapabilities;
        /**
        * The server is interested in notifications/requests for operations on files.
        *
        * @since 3.16.0
        */
        fileOperations?: FileOperationOptions;
    };
    /**
     * Experimental server capabilities.
     */
    experimental?: T;
}
/**
 * The initialize request is sent from the client to the server.
 * It is sent once as the request after starting up the server.
 * The requests parameter is of type {@link InitializeParams}
 * the response if of type {@link InitializeResult} of a Thenable that
 * resolves to such.
 */
export declare namespace InitializeRequest {
    const method: 'initialize';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<InitializeParams, InitializeResult<any>, never, InitializeError, void>;
}
/**
 * The initialize parameters
 */
export interface _InitializeParams extends WorkDoneProgressParams {
    /**
     * The process Id of the parent process that started
     * the server.
     *
     * Is `null` if the process has not been started by another process.
     * If the parent process is not alive then the server should exit.
     */
    processId: integer | null;
    /**
     * Information about the client
     *
     * @since 3.15.0
     */
    clientInfo?: {
        /**
         * The name of the client as defined by the client.
         */
        name: string;
        /**
         * The client's version as defined by the client.
         */
        version?: string;
    };
    /**
     * The locale the client is currently showing the user interface
     * in. This must not necessarily be the locale of the operating
     * system.
     *
     * Uses IETF language tags as the value's syntax
     * (See https://en.wikipedia.org/wiki/IETF_language_tag)
     *
     * @since 3.16.0
     */
    locale?: string;
    /**
     * The rootPath of the workspace. Is null
     * if no folder is open.
     *
     * @deprecated in favour of rootUri.
     */
    rootPath?: string | null;
    /**
     * The rootUri of the workspace. Is null if no
     * folder is open. If both `rootPath` and `rootUri` are set
     * `rootUri` wins.
     *
     * @deprecated in favour of workspaceFolders.
     */
    rootUri: DocumentUri | null;
    /**
     * The capabilities provided by the client (editor or tool)
     */
    capabilities: ClientCapabilities;
    /**
     * User provided initialization options.
     */
    initializationOptions?: LSPAny;
    /**
     * The initial trace setting. If omitted trace is disabled ('off').
     */
    trace?: TraceValues;
}
export type InitializeParams = _InitializeParams & WorkspaceFoldersInitializeParams;
/**
 * The result returned from an initialize request.
 */
export interface InitializeResult<T = any> {
    /**
     * The capabilities the language server provides.
     */
    capabilities: ServerCapabilities<T>;
    /**
     * Information about the server.
     *
     * @since 3.15.0
     */
    serverInfo?: {
        /**
         * The name of the server as defined by the server.
         */
        name: string;
        /**
         * The server's version as defined by the server.
         */
        version?: string;
    };
    /**
     * Custom initialization results.
     */
    [custom: string]: LSPAny | ServerCapabilities<T> | undefined; /** undefined is needed since serverInfo is optional */
}
/**
 * Known error codes for an `InitializeErrorCodes`;
 */
export declare namespace InitializeErrorCodes {
    /**
     * If the protocol version provided by the client can't be handled by the server.
     *
     * @deprecated This initialize error got replaced by client capabilities. There is
     * no version handshake in version 3.0x
     */
    const unknownProtocolVersion: 1;
}
export type InitializeErrorCodes = 1;
/**
 * The data type of the ResponseError if the
 * initialize request fails.
 */
export interface InitializeError {
    /**
     * Indicates whether the client execute the following retry logic:
     * (1) show the message provided by the ResponseError to the user
     * (2) user selects retry or cancel
     * (3) if user selected retry the initialize method is sent again.
     */
    retry: boolean;
}
export interface InitializedParams {
}
/**
 * The initialized notification is sent from the client to the
 * server after the client is fully initialized and the server
 * is allowed to send requests from the server to the client.
 */
export declare namespace InitializedNotification {
    const method: 'initialized';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<InitializedParams, void>;
}
/**
 * A shutdown request is sent from the client to the server.
 * It is sent once when the client decides to shutdown the
 * server. The only notification that is sent after a shutdown request
 * is the exit event.
 */
export declare namespace ShutdownRequest {
    const method: 'shutdown';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType0<void, never, void, void>;
}
/**
 * The exit event is sent from the client to the server to
 * ask the server to exit its process.
 */
export declare namespace ExitNotification {
    const method: 'exit';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType0<void>;
}
export interface DidChangeConfigurationClientCapabilities {
    /**
     * Did change configuration notification supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * The configuration change notification is sent from the client to the server
 * when the client's configuration has changed. The notification contains
 * the changed configuration as defined by the language client.
 */
export declare namespace DidChangeConfigurationNotification {
    const method: 'workspace/didChangeConfiguration';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidChangeConfigurationParams, DidChangeConfigurationRegistrationOptions>;
}
export interface DidChangeConfigurationRegistrationOptions {
    section?: string | string[];
}
/**
 * The parameters of a change configuration notification.
 */
export interface DidChangeConfigurationParams {
    /**
     * The actual changed settings
     */
    settings: LSPAny;
}
/**
 * The message type
 */
export declare namespace MessageType {
    /**
     * An error message.
     */
    const Error = 1;
    /**
     * A warning message.
     */
    const Warning = 2;
    /**
     * An information message.
     */
    const Info = 3;
    /**
     * A log message.
     */
    const Log = 4;
    /**
     * A debug message.
     *
     * @since 3.18.0
     */
    const Debug = 5;
}
export type MessageType = 1 | 2 | 3 | 4 | 5;
/**
 * The parameters of a notification message.
 */
export interface ShowMessageParams {
    /**
     * The message type. See {@link MessageType}
     */
    type: MessageType;
    /**
     * The actual message.
     */
    message: string;
}
/**
 * The show message notification is sent from a server to a client to ask
 * the client to display a particular message in the user interface.
 */
export declare namespace ShowMessageNotification {
    const method: 'window/showMessage';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<ShowMessageParams, void>;
}
/**
 * Show message request client capabilities
 */
export interface ShowMessageRequestClientCapabilities {
    /**
     * Capabilities specific to the `MessageActionItem` type.
     */
    messageActionItem?: {
        /**
         * Whether the client supports additional attributes which
         * are preserved and send back to the server in the
         * request's response.
         */
        additionalPropertiesSupport?: boolean;
    };
}
export interface MessageActionItem {
    /**
     * A short title like 'Retry', 'Open Log' etc.
     */
    title: string;
    /**
     * Additional attributes that the client preserves and
     * sends back to the server. This depends on the client
     * capability window.messageActionItem.additionalPropertiesSupport
     */
    [key: string]: string | boolean | integer | object;
}
export interface ShowMessageRequestParams {
    /**
     * The message type. See {@link MessageType}
     */
    type: MessageType;
    /**
     * The actual message.
     */
    message: string;
    /**
     * The message action items to present.
     */
    actions?: MessageActionItem[];
}
/**
 * The show message request is sent from the server to the client to show a message
 * and a set of options actions to the user.
 */
export declare namespace ShowMessageRequest {
    const method: 'window/showMessageRequest';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ShowMessageRequestParams, MessageActionItem | null, never, void, void>;
}
/**
 * The log message notification is sent from the server to the client to ask
 * the client to log a particular message.
 */
export declare namespace LogMessageNotification {
    const method: 'window/logMessage';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<LogMessageParams, void>;
}
/**
 * The log message parameters.
 */
export interface LogMessageParams {
    /**
     * The message type. See {@link MessageType}
     */
    type: MessageType;
    /**
     * The actual message.
     */
    message: string;
}
/**
 * The telemetry event notification is sent from the server to the client to ask
 * the client to log telemetry data.
 */
export declare namespace TelemetryEventNotification {
    const method: 'telemetry/event';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<any, void>;
}
export interface TextDocumentSyncClientCapabilities {
    /**
     * Whether text document synchronization supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * The client supports sending will save notifications.
     */
    willSave?: boolean;
    /**
     * The client supports sending a will save request and
     * waits for a response providing text edits which will
     * be applied to the document before it is saved.
     */
    willSaveWaitUntil?: boolean;
    /**
     * The client supports did save notifications.
     */
    didSave?: boolean;
}
/**
 * Defines how the host (editor) should sync
 * document changes to the language server.
 */
export declare namespace TextDocumentSyncKind {
    /**
     * Documents should not be synced at all.
     */
    const None = 0;
    /**
     * Documents are synced by always sending the full content
     * of the document.
     */
    const Full = 1;
    /**
     * Documents are synced by sending the full content on open.
     * After that only incremental updates to the document are
     * send.
     */
    const Incremental = 2;
}
export type TextDocumentSyncKind = 0 | 1 | 2;
export interface TextDocumentSyncOptions {
    /**
     * Open and close notifications are sent to the server. If omitted open close notification should not
     * be sent.
     */
    openClose?: boolean;
    /**
     * Change notifications are sent to the server. See TextDocumentSyncKind.None, TextDocumentSyncKind.Full
     * and TextDocumentSyncKind.Incremental. If omitted it defaults to TextDocumentSyncKind.None.
     */
    change?: TextDocumentSyncKind;
    /**
     * If present will save notifications are sent to the server. If omitted the notification should not be
     * sent.
     */
    willSave?: boolean;
    /**
     * If present will save wait until requests are sent to the server. If omitted the request should not be
     * sent.
     */
    willSaveWaitUntil?: boolean;
    /**
     * If present save notifications are sent to the server. If omitted the notification should not be
     * sent.
     */
    save?: boolean | SaveOptions;
}
/**
 * The parameters sent in an open text document notification
 */
export interface DidOpenTextDocumentParams {
    /**
     * The document that was opened.
     */
    textDocument: TextDocumentItem;
}
/**
 * The document open notification is sent from the client to the server to signal
 * newly opened text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri. Open in this sense means it is managed by the client. It doesn't necessarily
 * mean that its content is presented in an editor. An open notification must not
 * be sent more than once without a corresponding close notification send before.
 * This means open and close notification must be balanced and the max open count
 * is one.
 */
export declare namespace DidOpenTextDocumentNotification {
    const method: 'textDocument/didOpen';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidOpenTextDocumentParams, TextDocumentRegistrationOptions>;
}
/**
 * An event describing a change to a text document. If only a text is provided
 * it is considered to be the full content of the document.
 */
export type TextDocumentContentChangeEvent = {
    /**
     * The range of the document that changed.
     */
    range: Range;
    /**
     * The optional length of the range that got replaced.
     *
     * @deprecated use range instead.
     */
    rangeLength?: uinteger;
    /**
     * The new text for the provided range.
     */
    text: string;
} | {
    /**
     * The new text of the whole document.
     */
    text: string;
};
export declare namespace TextDocumentContentChangeEvent {
    /**
     * Checks whether the information describes a delta event.
     */
    function isIncremental(event: TextDocumentContentChangeEvent): event is {
        range: Range;
        rangeLength?: uinteger;
        text: string;
    };
    /**
     * Checks whether the information describes a full replacement event.
     */
    function isFull(event: TextDocumentContentChangeEvent): event is {
        text: string;
    };
}
/**
 * The change text document notification's parameters.
 */
export interface DidChangeTextDocumentParams {
    /**
     * The document that did change. The version number points
     * to the version after all provided content changes have
     * been applied.
     */
    textDocument: VersionedTextDocumentIdentifier;
    /**
     * The actual content changes. The content changes describe single state changes
     * to the document. So if there are two content changes c1 (at array index 0) and
     * c2 (at array index 1) for a document in state S then c1 moves the document from
     * S to S' and c2 from S' to S''. So c1 is computed on the state S and c2 is computed
     * on the state S'.
     *
     * To mirror the content of a document using change events use the following approach:
     * - start with the same initial content
     * - apply the 'textDocument/didChange' notifications in the order you receive them.
     * - apply the `TextDocumentContentChangeEvent`s in a single notification in the order
     *   you receive them.
     */
    contentChanges: TextDocumentContentChangeEvent[];
}
/**
 * Describe options to be used when registered for text document change events.
 */
export interface TextDocumentChangeRegistrationOptions extends TextDocumentRegistrationOptions {
    /**
     * How documents are synced to the server.
     */
    syncKind: TextDocumentSyncKind;
}
/**
 * The document change notification is sent from the client to the server to signal
 * changes to a text document.
 */
export declare namespace DidChangeTextDocumentNotification {
    const method: 'textDocument/didChange';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidChangeTextDocumentParams, TextDocumentChangeRegistrationOptions>;
}
/**
 * The parameters sent in a close text document notification
 */
export interface DidCloseTextDocumentParams {
    /**
     * The document that was closed.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * The document close notification is sent from the client to the server when
 * the document got closed in the client. The document's truth now exists where
 * the document's uri points to (e.g. if the document's uri is a file uri the
 * truth now exists on disk). As with the open notification the close notification
 * is about managing the document's content. Receiving a close notification
 * doesn't mean that the document was open in an editor before. A close
 * notification requires a previous open notification to be sent.
 */
export declare namespace DidCloseTextDocumentNotification {
    const method: 'textDocument/didClose';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidCloseTextDocumentParams, TextDocumentRegistrationOptions>;
}
/**
 * The parameters sent in a save text document notification
 */
export interface DidSaveTextDocumentParams {
    /**
     * The document that was saved.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * Optional the content when saved. Depends on the includeText value
     * when the save notification was requested.
     */
    text?: string;
}
/**
 * Save registration options.
 */
export interface TextDocumentSaveRegistrationOptions extends TextDocumentRegistrationOptions, SaveOptions {
}
/**
 * The document save notification is sent from the client to the server when
 * the document got saved in the client.
 */
export declare namespace DidSaveTextDocumentNotification {
    const method: 'textDocument/didSave';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidSaveTextDocumentParams, TextDocumentSaveRegistrationOptions>;
}
/**
 * Represents reasons why a text document is saved.
 */
export declare namespace TextDocumentSaveReason {
    /**
     * Manually triggered, e.g. by the user pressing save, by starting debugging,
     * or by an API call.
     */
    const Manual: 1;
    /**
     * Automatic after a delay.
     */
    const AfterDelay: 2;
    /**
     * When the editor lost focus.
     */
    const FocusOut: 3;
}
export type TextDocumentSaveReason = 1 | 2 | 3;
/**
 * The parameters sent in a will save text document notification.
 */
export interface WillSaveTextDocumentParams {
    /**
     * The document that will be saved.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The 'TextDocumentSaveReason'.
     */
    reason: TextDocumentSaveReason;
}
/**
 * A document will save notification is sent from the client to the server before
 * the document is actually saved.
 */
export declare namespace WillSaveTextDocumentNotification {
    const method: 'textDocument/willSave';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<WillSaveTextDocumentParams, TextDocumentRegistrationOptions>;
}
/**
 * A document will save request is sent from the client to the server before
 * the document is actually saved. The request can return an array of TextEdits
 * which will be applied to the text document before it is saved. Please note that
 * clients might drop results if computing the text edits took too long or if a
 * server constantly fails on this request. This is done to keep the save fast and
 * reliable.
 */
export declare namespace WillSaveTextDocumentWaitUntilRequest {
    const method: 'textDocument/willSaveWaitUntil';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<WillSaveTextDocumentParams, TextEdit[] | null, never, void, TextDocumentRegistrationOptions>;
}
export interface DidChangeWatchedFilesClientCapabilities {
    /**
     * Did change watched files notification supports dynamic registration. Please note
     * that the current protocol doesn't support static configuration for file changes
     * from the server side.
     */
    dynamicRegistration?: boolean;
    /**
     * Whether the client has support for {@link  RelativePattern relative pattern}
     * or not.
     *
     * @since 3.17.0
     */
    relativePatternSupport?: boolean;
}
/**
 * The watched files notification is sent from the client to the server when
 * the client detects changes to file watched by the language client.
 */
export declare namespace DidChangeWatchedFilesNotification {
    const method: 'workspace/didChangeWatchedFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DidChangeWatchedFilesParams, DidChangeWatchedFilesRegistrationOptions>;
}
/**
 * The watched files change notification's parameters.
 */
export interface DidChangeWatchedFilesParams {
    /**
     * The actual file events.
     */
    changes: FileEvent[];
}
/**
 * The file event type
 */
export declare namespace FileChangeType {
    /**
     * The file got created.
     */
    const Created = 1;
    /**
     * The file got changed.
     */
    const Changed = 2;
    /**
     * The file got deleted.
     */
    const Deleted = 3;
}
export type FileChangeType = 1 | 2 | 3;
/**
 * An event describing a file change.
 */
export interface FileEvent {
    /**
     * The file's uri.
     */
    uri: DocumentUri;
    /**
     * The change type.
     */
    type: FileChangeType;
}
/**
 * Describe options to be used when registered for text document change events.
 */
export interface DidChangeWatchedFilesRegistrationOptions {
    /**
     * The watchers to register.
     */
    watchers: FileSystemWatcher[];
}
/**
 * The glob pattern to watch relative to the base path. Glob patterns can have the following syntax:
 * - `*` to match one or more characters in a path segment
 * - `?` to match on one character in a path segment
 * - `**` to match any number of path segments, including none
 * - `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
 *
 * @since 3.17.0
 */
export type Pattern = string;
/**
 * A relative pattern is a helper to construct glob patterns that are matched
 * relatively to a base URI. The common value for a `baseUri` is a workspace
 * folder root, but it can be another absolute URI as well.
 *
 * @since 3.17.0
 */
export interface RelativePattern {
    /**
     * A workspace folder or a base URI to which this pattern will be matched
     * against relatively.
     */
    baseUri: WorkspaceFolder | URI;
    /**
     * The actual glob pattern;
     */
    pattern: Pattern;
}
export declare namespace RelativePattern {
    function is(value: any): value is RelativePattern;
}
/**
 * The glob pattern. Either a string pattern or a relative pattern.
 *
 * @since 3.17.0
 */
export type GlobPattern = Pattern | RelativePattern;
export interface FileSystemWatcher {
    /**
     * The glob pattern to watch. See {@link GlobPattern glob pattern} for more detail.
     *
     * @since 3.17.0 support for relative patterns.
     */
    globPattern: GlobPattern;
    /**
     * The kind of events of interest. If omitted it defaults
     * to WatchKind.Create | WatchKind.Change | WatchKind.Delete
     * which is 7.
     */
    kind?: WatchKind;
}
export declare namespace WatchKind {
    /**
     * Interested in create events.
     */
    const Create: 1;
    /**
     * Interested in change events
     */
    const Change: 2;
    /**
     * Interested in delete events
     */
    const Delete: 4;
}
export type WatchKind = uinteger;
/**
 * The publish diagnostic client capabilities.
 */
export interface PublishDiagnosticsClientCapabilities {
    /**
     * Whether the clients accepts diagnostics with related information.
     */
    relatedInformation?: boolean;
    /**
     * Client supports the tag property to provide meta data about a diagnostic.
     * Clients supporting tags have to handle unknown tags gracefully.
     *
     * @since 3.15.0
     */
    tagSupport?: {
        /**
         * The tags supported by the client.
         */
        valueSet: DiagnosticTag[];
    };
    /**
     * Whether the client interprets the version property of the
     * `textDocument/publishDiagnostics` notification's parameter.
     *
     * @since 3.15.0
     */
    versionSupport?: boolean;
    /**
     * Client supports a codeDescription property
     *
     * @since 3.16.0
     */
    codeDescriptionSupport?: boolean;
    /**
     * Whether code action supports the `data` property which is
     * preserved between a `textDocument/publishDiagnostics` and
     * `textDocument/codeAction` request.
     *
     * @since 3.16.0
     */
    dataSupport?: boolean;
}
/**
 * The publish diagnostic notification's parameters.
 */
export interface PublishDiagnosticsParams {
    /**
     * The URI for which diagnostic information is reported.
     */
    uri: DocumentUri;
    /**
     * Optional the version number of the document the diagnostics are published for.
     *
     * @since 3.15.0
     */
    version?: integer;
    /**
     * An array of diagnostic information items.
     */
    diagnostics: Diagnostic[];
}
/**
 * Diagnostics notification are sent from the server to the client to signal
 * results of validation runs.
 */
export declare namespace PublishDiagnosticsNotification {
    const method: 'textDocument/publishDiagnostics';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<PublishDiagnosticsParams, void>;
}
/**
 * Completion client capabilities
 */
export interface CompletionClientCapabilities {
    /**
     * Whether completion supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * The client supports the following `CompletionItem` specific
     * capabilities.
     */
    completionItem?: {
        /**
         * Client supports snippets as insert text.
         *
         * A snippet can define tab stops and placeholders with `$1`, `$2`
         * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
         * the end of the snippet. Placeholders with equal identifiers are linked,
         * that is typing in one will update others too.
         */
        snippetSupport?: boolean;
        /**
         * Client supports commit characters on a completion item.
         */
        commitCharactersSupport?: boolean;
        /**
         * Client supports the following content formats for the documentation
         * property. The order describes the preferred format of the client.
         */
        documentationFormat?: MarkupKind[];
        /**
         * Client supports the deprecated property on a completion item.
         */
        deprecatedSupport?: boolean;
        /**
         * Client supports the preselect property on a completion item.
         */
        preselectSupport?: boolean;
        /**
         * Client supports the tag property on a completion item. Clients supporting
         * tags have to handle unknown tags gracefully. Clients especially need to
         * preserve unknown tags when sending a completion item back to the server in
         * a resolve call.
         *
         * @since 3.15.0
         */
        tagSupport?: {
            /**
             * The tags supported by the client.
             */
            valueSet: CompletionItemTag[];
        };
        /**
         * Client support insert replace edit to control different behavior if a
         * completion item is inserted in the text or should replace text.
         *
         * @since 3.16.0
         */
        insertReplaceSupport?: boolean;
        /**
         * Indicates which properties a client can resolve lazily on a completion
         * item. Before version 3.16.0 only the predefined properties `documentation`
         * and `details` could be resolved lazily.
         *
         * @since 3.16.0
         */
        resolveSupport?: {
            /**
             * The properties that a client can resolve lazily.
             */
            properties: string[];
        };
        /**
         * The client supports the `insertTextMode` property on
         * a completion item to override the whitespace handling mode
         * as defined by the client (see `insertTextMode`).
         *
         * @since 3.16.0
         */
        insertTextModeSupport?: {
            valueSet: InsertTextMode[];
        };
        /**
         * The client has support for completion item label
         * details (see also `CompletionItemLabelDetails`).
         *
         * @since 3.17.0
         */
        labelDetailsSupport?: boolean;
    };
    completionItemKind?: {
        /**
         * The completion item kind values the client supports. When this
         * property exists the client also guarantees that it will
         * handle values outside its set gracefully and falls back
         * to a default value when unknown.
         *
         * If this property is not present the client only supports
         * the completion items kinds from `Text` to `Reference` as defined in
         * the initial version of the protocol.
         */
        valueSet?: CompletionItemKind[];
    };
    /**
     * Defines how the client handles whitespace and indentation
     * when accepting a completion item that uses multi line
     * text in either `insertText` or `textEdit`.
     *
     * @since 3.17.0
     */
    insertTextMode?: InsertTextMode;
    /**
     * The client supports to send additional context information for a
     * `textDocument/completion` request.
     */
    contextSupport?: boolean;
    /**
     * The client supports the following `CompletionList` specific
     * capabilities.
     *
     * @since 3.17.0
     */
    completionList?: {
        /**
         * The client supports the following itemDefaults on
         * a completion list.
         *
         * The value lists the supported property names of the
         * `CompletionList.itemDefaults` object. If omitted
         * no properties are supported.
         *
         * @since 3.17.0
         */
        itemDefaults?: string[];
    };
}
/**
 * How a completion was triggered
 */
export declare namespace CompletionTriggerKind {
    /**
     * Completion was triggered by typing an identifier (24x7 code
     * complete), manual invocation (e.g Ctrl+Space) or via API.
     */
    const Invoked: 1;
    /**
     * Completion was triggered by a trigger character specified by
     * the `triggerCharacters` properties of the `CompletionRegistrationOptions`.
     */
    const TriggerCharacter: 2;
    /**
     * Completion was re-triggered as current completion list is incomplete
     */
    const TriggerForIncompleteCompletions: 3;
}
export type CompletionTriggerKind = 1 | 2 | 3;
/**
 * Contains additional information about the context in which a completion request is triggered.
 */
export interface CompletionContext {
    /**
     * How the completion was triggered.
     */
    triggerKind: CompletionTriggerKind;
    /**
     * The trigger character (a single character) that has trigger code complete.
     * Is undefined if `triggerKind !== CompletionTriggerKind.TriggerCharacter`
     */
    triggerCharacter?: string;
}
/**
 * Completion parameters
 */
export interface CompletionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
    /**
     * The completion context. This is only available it the client specifies
     * to send this using the client capability `textDocument.completion.contextSupport === true`
     */
    context?: CompletionContext;
}
/**
 * Completion options.
 */
export interface CompletionOptions extends WorkDoneProgressOptions {
    /**
     * Most tools trigger completion request automatically without explicitly requesting
     * it using a keyboard shortcut (e.g. Ctrl+Space). Typically they do so when the user
     * starts to type an identifier. For example if the user types `c` in a JavaScript file
     * code complete will automatically pop up present `console` besides others as a
     * completion item. Characters that make up identifiers don't need to be listed here.
     *
     * If code complete should automatically be trigger on characters not being valid inside
     * an identifier (for example `.` in JavaScript) list them in `triggerCharacters`.
     */
    triggerCharacters?: string[];
    /**
     * The list of all possible characters that commit a completion. This field can be used
     * if clients don't support individual commit characters per completion item. See
     * `ClientCapabilities.textDocument.completion.completionItem.commitCharactersSupport`
     *
     * If a server provides both `allCommitCharacters` and commit characters on an individual
     * completion item the ones on the completion item win.
     *
     * @since 3.2.0
     */
    allCommitCharacters?: string[];
    /**
     * The server provides support to resolve additional
     * information for a completion item.
     */
    resolveProvider?: boolean;
    /**
     * The server supports the following `CompletionItem` specific
     * capabilities.
     *
     * @since 3.17.0
     */
    completionItem?: {
        /**
         * The server has support for completion item label
         * details (see also `CompletionItemLabelDetails`) when
         * receiving a completion item in a resolve call.
         *
         * @since 3.17.0
         */
        labelDetailsSupport?: boolean;
    };
}
/**
 * Registration options for a {@link CompletionRequest}.
 */
export interface CompletionRegistrationOptions extends TextDocumentRegistrationOptions, CompletionOptions {
}
/**
 * Request to request completion at a given text document position. The request's
 * parameter is of type {@link TextDocumentPosition} the response
 * is of type {@link CompletionItem CompletionItem[]} or {@link CompletionList}
 * or a Thenable that resolves to such.
 *
 * The request can delay the computation of the {@link CompletionItem.detail `detail`}
 * and {@link CompletionItem.documentation `documentation`} properties to the `completionItem/resolve`
 * request. However, properties that are needed for the initial sorting and filtering, like `sortText`,
 * `filterText`, `insertText`, and `textEdit`, must not be changed during resolve.
 */
export declare namespace CompletionRequest {
    const method: 'textDocument/completion';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CompletionParams, CompletionList | CompletionItem[] | null, CompletionItem[], void, CompletionRegistrationOptions>;
}
/**
 * Request to resolve additional information for a given completion item.The request's
 * parameter is of type {@link CompletionItem} the response
 * is of type {@link CompletionItem} or a Thenable that resolves to such.
 */
export declare namespace CompletionResolveRequest {
    const method: 'completionItem/resolve';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CompletionItem, CompletionItem, never, void, void>;
}
export interface HoverClientCapabilities {
    /**
     * Whether hover supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Client supports the following content formats for the content
     * property. The order describes the preferred format of the client.
     */
    contentFormat?: MarkupKind[];
}
/**
 * Hover options.
 */
export interface HoverOptions extends WorkDoneProgressOptions {
}
/**
 * Parameters for a {@link HoverRequest}.
 */
export interface HoverParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
/**
 * Registration options for a {@link HoverRequest}.
 */
export interface HoverRegistrationOptions extends TextDocumentRegistrationOptions, HoverOptions {
}
/**
 * Request to request hover information at a given text document position. The request's
 * parameter is of type {@link TextDocumentPosition} the response is of
 * type {@link Hover} or a Thenable that resolves to such.
 */
export declare namespace HoverRequest {
    const method: 'textDocument/hover';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<HoverParams, Hover | null, never, void, HoverRegistrationOptions>;
}
/**
 * Client Capabilities for a {@link SignatureHelpRequest}.
 */
export interface SignatureHelpClientCapabilities {
    /**
     * Whether signature help supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * The client supports the following `SignatureInformation`
     * specific properties.
     */
    signatureInformation?: {
        /**
         * Client supports the following content formats for the documentation
         * property. The order describes the preferred format of the client.
         */
        documentationFormat?: MarkupKind[];
        /**
         * Client capabilities specific to parameter information.
         */
        parameterInformation?: {
            /**
             * The client supports processing label offsets instead of a
             * simple label string.
             *
             * @since 3.14.0
             */
            labelOffsetSupport?: boolean;
        };
        /**
         * The client supports the `activeParameter` property on `SignatureInformation`
         * literal.
         *
         * @since 3.16.0
         */
        activeParameterSupport?: boolean;
    };
    /**
     * The client supports to send additional context information for a
     * `textDocument/signatureHelp` request. A client that opts into
     * contextSupport will also support the `retriggerCharacters` on
     * `SignatureHelpOptions`.
     *
     * @since 3.15.0
     */
    contextSupport?: boolean;
}
/**
 * Server Capabilities for a {@link SignatureHelpRequest}.
 */
export interface SignatureHelpOptions extends WorkDoneProgressOptions {
    /**
     * List of characters that trigger signature help automatically.
     */
    triggerCharacters?: string[];
    /**
     * List of characters that re-trigger signature help.
     *
     * These trigger characters are only active when signature help is already showing. All trigger characters
     * are also counted as re-trigger characters.
     *
     * @since 3.15.0
     */
    retriggerCharacters?: string[];
}
/**
 * How a signature help was triggered.
 *
 * @since 3.15.0
 */
export declare namespace SignatureHelpTriggerKind {
    /**
     * Signature help was invoked manually by the user or by a command.
     */
    const Invoked: 1;
    /**
     * Signature help was triggered by a trigger character.
     */
    const TriggerCharacter: 2;
    /**
     * Signature help was triggered by the cursor moving or by the document content changing.
     */
    const ContentChange: 3;
}
export type SignatureHelpTriggerKind = 1 | 2 | 3;
/**
 * Additional information about the context in which a signature help request was triggered.
 *
 * @since 3.15.0
 */
export interface SignatureHelpContext {
    /**
     * Action that caused signature help to be triggered.
     */
    triggerKind: SignatureHelpTriggerKind;
    /**
     * Character that caused signature help to be triggered.
     *
     * This is undefined when `triggerKind !== SignatureHelpTriggerKind.TriggerCharacter`
     */
    triggerCharacter?: string;
    /**
     * `true` if signature help was already showing when it was triggered.
     *
     * Retriggers occurs when the signature help is already active and can be caused by actions such as
     * typing a trigger character, a cursor move, or document content changes.
     */
    isRetrigger: boolean;
    /**
     * The currently active `SignatureHelp`.
     *
     * The `activeSignatureHelp` has its `SignatureHelp.activeSignature` field updated based on
     * the user navigating through available signatures.
     */
    activeSignatureHelp?: SignatureHelp;
}
/**
 * Parameters for a {@link SignatureHelpRequest}.
 */
export interface SignatureHelpParams extends TextDocumentPositionParams, WorkDoneProgressParams {
    /**
     * The signature help context. This is only available if the client specifies
     * to send this using the client capability `textDocument.signatureHelp.contextSupport === true`
     *
     * @since 3.15.0
     */
    context?: SignatureHelpContext;
}
/**
 * Registration options for a {@link SignatureHelpRequest}.
 */
export interface SignatureHelpRegistrationOptions extends TextDocumentRegistrationOptions, SignatureHelpOptions {
}
export declare namespace SignatureHelpRequest {
    const method: 'textDocument/signatureHelp';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<SignatureHelpParams, SignatureHelp | null, never, void, SignatureHelpRegistrationOptions>;
}
/**
 * Client Capabilities for a {@link DefinitionRequest}.
 */
export interface DefinitionClientCapabilities {
    /**
     * Whether definition supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * The client supports additional metadata in the form of definition links.
     *
     * @since 3.14.0
     */
    linkSupport?: boolean;
}
/**
 * Server Capabilities for a {@link DefinitionRequest}.
 */
export interface DefinitionOptions extends WorkDoneProgressOptions {
}
/**
 * Parameters for a {@link DefinitionRequest}.
 */
export interface DefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}
/**
 * Registration options for a {@link DefinitionRequest}.
 */
export interface DefinitionRegistrationOptions extends TextDocumentRegistrationOptions, DefinitionOptions {
}
/**
 * A request to resolve the definition location of a symbol at a given text
 * document position. The request's parameter is of type {@link TextDocumentPosition}
 * the response is of either type {@link Definition} or a typed array of
 * {@link DefinitionLink} or a Thenable that resolves to such.
 */
export declare namespace DefinitionRequest {
    const method: 'textDocument/definition';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DefinitionParams, Definition | LocationLink[] | null, Location[] | LocationLink[], void, DefinitionRegistrationOptions>;
}
/**
 * Client Capabilities for a {@link ReferencesRequest}.
 */
export interface ReferenceClientCapabilities {
    /**
     * Whether references supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * Parameters for a {@link ReferencesRequest}.
 */
export interface ReferenceParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
    context: ReferenceContext;
}
/**
 * Reference options.
 */
export interface ReferenceOptions extends WorkDoneProgressOptions {
}
/**
 * Registration options for a {@link ReferencesRequest}.
 */
export interface ReferenceRegistrationOptions extends TextDocumentRegistrationOptions, ReferenceOptions {
}
/**
 * A request to resolve project-wide references for the symbol denoted
 * by the given text document position. The request's parameter is of
 * type {@link ReferenceParams} the response is of type
 * {@link Location Location[]} or a Thenable that resolves to such.
 */
export declare namespace ReferencesRequest {
    const method: 'textDocument/references';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ReferenceParams, Location[] | null, Location[], void, ReferenceRegistrationOptions>;
}
/**
 * Client Capabilities for a {@link DocumentHighlightRequest}.
 */
export interface DocumentHighlightClientCapabilities {
    /**
     * Whether document highlight supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * Parameters for a {@link DocumentHighlightRequest}.
 */
export interface DocumentHighlightParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}
/**
 * Provider options for a {@link DocumentHighlightRequest}.
 */
export interface DocumentHighlightOptions extends WorkDoneProgressOptions {
}
/**
 * Registration options for a {@link DocumentHighlightRequest}.
 */
export interface DocumentHighlightRegistrationOptions extends TextDocumentRegistrationOptions, DocumentHighlightOptions {
}
/**
 * Request to resolve a {@link DocumentHighlight} for a given
 * text document position. The request's parameter is of type {@link TextDocumentPosition}
 * the request response is an array of type {@link DocumentHighlight}
 * or a Thenable that resolves to such.
 */
export declare namespace DocumentHighlightRequest {
    const method: 'textDocument/documentHighlight';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentHighlightParams, DocumentHighlight[] | null, DocumentHighlight[], void, DocumentHighlightRegistrationOptions>;
}
/**
 * Client Capabilities for a {@link DocumentSymbolRequest}.
 */
export interface DocumentSymbolClientCapabilities {
    /**
     * Whether document symbol supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Specific capabilities for the `SymbolKind` in the
     * `textDocument/documentSymbol` request.
     */
    symbolKind?: {
        /**
         * The symbol kind values the client supports. When this
         * property exists the client also guarantees that it will
         * handle values outside its set gracefully and falls back
         * to a default value when unknown.
         *
         * If this property is not present the client only supports
         * the symbol kinds from `File` to `Array` as defined in
         * the initial version of the protocol.
         */
        valueSet?: SymbolKind[];
    };
    /**
     * The client supports hierarchical document symbols.
     */
    hierarchicalDocumentSymbolSupport?: boolean;
    /**
     * The client supports tags on `SymbolInformation`. Tags are supported on
     * `DocumentSymbol` if `hierarchicalDocumentSymbolSupport` is set to true.
     * Clients supporting tags have to handle unknown tags gracefully.
     *
     * @since 3.16.0
     */
    tagSupport?: {
        /**
         * The tags supported by the client.
         */
        valueSet: SymbolTag[];
    };
    /**
     * The client supports an additional label presented in the UI when
     * registering a document symbol provider.
     *
     * @since 3.16.0
     */
    labelSupport?: boolean;
}
/**
 * Parameters for a {@link DocumentSymbolRequest}.
 */
export interface DocumentSymbolParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * Provider options for a {@link DocumentSymbolRequest}.
 */
export interface DocumentSymbolOptions extends WorkDoneProgressOptions {
    /**
     * A human-readable string that is shown when multiple outlines trees
     * are shown for the same document.
     *
     * @since 3.16.0
     */
    label?: string;
}
/**
 * Registration options for a {@link DocumentSymbolRequest}.
 */
export interface DocumentSymbolRegistrationOptions extends TextDocumentRegistrationOptions, DocumentSymbolOptions {
}
/**
 * A request to list all symbols found in a given text document. The request's
 * parameter is of type {@link TextDocumentIdentifier} the
 * response is of type {@link SymbolInformation SymbolInformation[]} or a Thenable
 * that resolves to such.
 */
export declare namespace DocumentSymbolRequest {
    const method: 'textDocument/documentSymbol';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentSymbolParams, DocumentSymbol[] | SymbolInformation[] | null, DocumentSymbol[] | SymbolInformation[], void, DocumentSymbolRegistrationOptions>;
}
/**
 * The Client Capabilities of a {@link CodeActionRequest}.
 */
export interface CodeActionClientCapabilities {
    /**
     * Whether code action supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * The client support code action literals of type `CodeAction` as a valid
     * response of the `textDocument/codeAction` request. If the property is not
     * set the request can only return `Command` literals.
     *
     * @since 3.8.0
     */
    codeActionLiteralSupport?: {
        /**
         * The code action kind is support with the following value
         * set.
         */
        codeActionKind: {
            /**
             * The code action kind values the client supports. When this
             * property exists the client also guarantees that it will
             * handle values outside its set gracefully and falls back
             * to a default value when unknown.
             */
            valueSet: CodeActionKind[];
        };
    };
    /**
     * Whether code action supports the `isPreferred` property.
     *
     * @since 3.15.0
     */
    isPreferredSupport?: boolean;
    /**
     * Whether code action supports the `disabled` property.
     *
     * @since 3.16.0
     */
    disabledSupport?: boolean;
    /**
     * Whether code action supports the `data` property which is
     * preserved between a `textDocument/codeAction` and a
     * `codeAction/resolve` request.
     *
     * @since 3.16.0
     */
    dataSupport?: boolean;
    /**
     * Whether the client supports resolving additional code action
     * properties via a separate `codeAction/resolve` request.
     *
     * @since 3.16.0
     */
    resolveSupport?: {
        /**
         * The properties that a client can resolve lazily.
         */
        properties: string[];
    };
    /**
     * Whether the client honors the change annotations in
     * text edits and resource operations returned via the
     * `CodeAction#edit` property by for example presenting
     * the workspace edit in the user interface and asking
     * for confirmation.
     *
     * @since 3.16.0
     */
    honorsChangeAnnotations?: boolean;
}
/**
 * The parameters of a {@link CodeActionRequest}.
 */
export interface CodeActionParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The document in which the command was invoked.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The range for which the command was invoked.
     */
    range: Range;
    /**
     * Context carrying additional information.
     */
    context: CodeActionContext;
}
/**
 * Provider options for a {@link CodeActionRequest}.
 */
export interface CodeActionOptions extends WorkDoneProgressOptions {
    /**
     * CodeActionKinds that this server may return.
     *
     * The list of kinds may be generic, such as `CodeActionKind.Refactor`, or the server
     * may list out every specific kind they provide.
     */
    codeActionKinds?: CodeActionKind[];
    /**
     * The server provides support to resolve additional
     * information for a code action.
     *
     * @since 3.16.0
     */
    resolveProvider?: boolean;
}
/**
 * Registration options for a {@link CodeActionRequest}.
 */
export interface CodeActionRegistrationOptions extends TextDocumentRegistrationOptions, CodeActionOptions {
}
/**
 * A request to provide commands for the given text document and range.
 */
export declare namespace CodeActionRequest {
    const method: 'textDocument/codeAction';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CodeActionParams, (Command | CodeAction)[] | null, (Command | CodeAction)[], void, CodeActionRegistrationOptions>;
}
/**
 * Request to resolve additional information for a given code action.The request's
 * parameter is of type {@link CodeAction} the response
 * is of type {@link CodeAction} or a Thenable that resolves to such.
 */
export declare namespace CodeActionResolveRequest {
    const method: 'codeAction/resolve';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CodeAction, CodeAction, never, void, void>;
}
/**
 * Client capabilities for a {@link WorkspaceSymbolRequest}.
 */
export interface WorkspaceSymbolClientCapabilities {
    /**
     * Symbol request supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Specific capabilities for the `SymbolKind` in the `workspace/symbol` request.
     */
    symbolKind?: {
        /**
         * The symbol kind values the client supports. When this
         * property exists the client also guarantees that it will
         * handle values outside its set gracefully and falls back
         * to a default value when unknown.
         *
         * If this property is not present the client only supports
         * the symbol kinds from `File` to `Array` as defined in
         * the initial version of the protocol.
         */
        valueSet?: SymbolKind[];
    };
    /**
     * The client supports tags on `SymbolInformation`.
     * Clients supporting tags have to handle unknown tags gracefully.
     *
     * @since 3.16.0
     */
    tagSupport?: {
        /**
         * The tags supported by the client.
         */
        valueSet: SymbolTag[];
    };
    /**
     * The client support partial workspace symbols. The client will send the
     * request `workspaceSymbol/resolve` to the server to resolve additional
     * properties.
     *
     * @since 3.17.0
     */
    resolveSupport?: {
        /**
         * The properties that a client can resolve lazily. Usually
         * `location.range`
         */
        properties: string[];
    };
}
/**
 * The parameters of a {@link WorkspaceSymbolRequest}.
 */
export interface WorkspaceSymbolParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * A query string to filter symbols by. Clients may send an empty
     * string here to request all symbols.
     */
    query: string;
}
/**
 * Server capabilities for a {@link WorkspaceSymbolRequest}.
 */
export interface WorkspaceSymbolOptions extends WorkDoneProgressOptions {
    /**
     * The server provides support to resolve additional
     * information for a workspace symbol.
     *
     * @since 3.17.0
     */
    resolveProvider?: boolean;
}
/**
 * Registration options for a {@link WorkspaceSymbolRequest}.
 */
export interface WorkspaceSymbolRegistrationOptions extends WorkspaceSymbolOptions {
}
/**
 * A request to list project-wide symbols matching the query string given
 * by the {@link WorkspaceSymbolParams}. The response is
 * of type {@link SymbolInformation SymbolInformation[]} or a Thenable that
 * resolves to such.
 *
 * @since 3.17.0 - support for WorkspaceSymbol in the returned data. Clients
 *  need to advertise support for WorkspaceSymbols via the client capability
 *  `workspace.symbol.resolveSupport`.
 *
 */
export declare namespace WorkspaceSymbolRequest {
    const method: 'workspace/symbol';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<WorkspaceSymbolParams, SymbolInformation[] | WorkspaceSymbol[] | null, SymbolInformation[] | WorkspaceSymbol[], void, WorkspaceSymbolRegistrationOptions>;
}
/**
 * A request to resolve the range inside the workspace
 * symbol's location.
 *
 * @since 3.17.0
 */
export declare namespace WorkspaceSymbolResolveRequest {
    const method: 'workspaceSymbol/resolve';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<WorkspaceSymbol, WorkspaceSymbol, never, void, void>;
}
/**
 * The client capabilities  of a {@link CodeLensRequest}.
 */
export interface CodeLensClientCapabilities {
    /**
     * Whether code lens supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * @since 3.16.0
 */
export interface CodeLensWorkspaceClientCapabilities {
    /**
     * Whether the client implementation supports a refresh request sent from the
     * server to the client.
     *
     * Note that this event is global and will force the client to refresh all
     * code lenses currently shown. It should be used with absolute care and is
     * useful for situation where a server for example detect a project wide
     * change that requires such a calculation.
     */
    refreshSupport?: boolean;
}
/**
 * The parameters of a {@link CodeLensRequest}.
 */
export interface CodeLensParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The document to request code lens for.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * Code Lens provider options of a {@link CodeLensRequest}.
 */
export interface CodeLensOptions extends WorkDoneProgressOptions {
    /**
     * Code lens has a resolve provider as well.
     */
    resolveProvider?: boolean;
}
/**
 * Registration options for a {@link CodeLensRequest}.
 */
export interface CodeLensRegistrationOptions extends TextDocumentRegistrationOptions, CodeLensOptions {
}
/**
 * A request to provide code lens for the given text document.
 */
export declare namespace CodeLensRequest {
    const method: 'textDocument/codeLens';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CodeLensParams, CodeLens[] | null, CodeLens[], void, CodeLensRegistrationOptions>;
}
/**
 * A request to resolve a command for a given code lens.
 */
export declare namespace CodeLensResolveRequest {
    const method: 'codeLens/resolve';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CodeLens, CodeLens, never, void, void>;
}
/**
 * A request to refresh all code actions
 *
 * @since 3.16.0
 */
export declare namespace CodeLensRefreshRequest {
    const method: `workspace/codeLens/refresh`;
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType0<void, void, void, void>;
}
/**
 * The client capabilities of a {@link DocumentLinkRequest}.
 */
export interface DocumentLinkClientCapabilities {
    /**
     * Whether document link supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Whether the client supports the `tooltip` property on `DocumentLink`.
     *
     * @since 3.15.0
     */
    tooltipSupport?: boolean;
}
/**
 * The parameters of a {@link DocumentLinkRequest}.
 */
export interface DocumentLinkParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The document to provide document links for.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * Provider options for a {@link DocumentLinkRequest}.
 */
export interface DocumentLinkOptions extends WorkDoneProgressOptions {
    /**
     * Document links have a resolve provider as well.
     */
    resolveProvider?: boolean;
}
/**
 * Registration options for a {@link DocumentLinkRequest}.
 */
export interface DocumentLinkRegistrationOptions extends TextDocumentRegistrationOptions, DocumentLinkOptions {
}
/**
 * A request to provide document links
 */
export declare namespace DocumentLinkRequest {
    const method: 'textDocument/documentLink';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentLinkParams, DocumentLink[] | null, DocumentLink[], void, DocumentLinkRegistrationOptions>;
}
/**
 * Request to resolve additional information for a given document link. The request's
 * parameter is of type {@link DocumentLink} the response
 * is of type {@link DocumentLink} or a Thenable that resolves to such.
 */
export declare namespace DocumentLinkResolveRequest {
    const method: 'documentLink/resolve';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentLink, DocumentLink, never, void, void>;
}
/**
 * Client capabilities of a {@link DocumentFormattingRequest}.
 */
export interface DocumentFormattingClientCapabilities {
    /**
     * Whether formatting supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * The parameters of a {@link DocumentFormattingRequest}.
 */
export interface DocumentFormattingParams extends WorkDoneProgressParams {
    /**
     * The document to format.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The format options.
     */
    options: FormattingOptions;
}
/**
 * Provider options for a {@link DocumentFormattingRequest}.
 */
export interface DocumentFormattingOptions extends WorkDoneProgressOptions {
}
/**
 * Registration options for a {@link DocumentFormattingRequest}.
 */
export interface DocumentFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentFormattingOptions {
}
/**
 * A request to format a whole document.
 */
export declare namespace DocumentFormattingRequest {
    const method: 'textDocument/formatting';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentFormattingParams, TextEdit[] | null, never, void, DocumentFormattingRegistrationOptions>;
}
/**
 * Client capabilities of a {@link DocumentRangeFormattingRequest}.
 */
export interface DocumentRangeFormattingClientCapabilities {
    /**
     * Whether range formatting supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Whether the client supports formatting multiple ranges at once.
     *
     * @since 3.18.0
     * @proposed
     */
    rangesSupport?: boolean;
}
/**
 * The parameters of a {@link DocumentRangeFormattingRequest}.
 */
export interface DocumentRangeFormattingParams extends WorkDoneProgressParams {
    /**
     * The document to format.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The range to format
     */
    range: Range;
    /**
     * The format options
     */
    options: FormattingOptions;
}
/**
 * The parameters of a {@link DocumentRangesFormattingRequest}.
 *
 * @since 3.18.0
 * @proposed
 */
export interface DocumentRangesFormattingParams extends WorkDoneProgressParams {
    /**
     * The document to format.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The ranges to format
     */
    ranges: Range[];
    /**
     * The format options
     */
    options: FormattingOptions;
}
/**
 * Provider options for a {@link DocumentRangeFormattingRequest}.
 */
export interface DocumentRangeFormattingOptions extends WorkDoneProgressOptions {
    /**
     * Whether the server supports formatting multiple ranges at once.
     *
     * @since 3.18.0
     * @proposed
     */
    rangesSupport?: boolean;
}
/**
 * Registration options for a {@link DocumentRangeFormattingRequest}.
 */
export interface DocumentRangeFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentRangeFormattingOptions {
}
/**
 * A request to format a range in a document.
 */
export declare namespace DocumentRangeFormattingRequest {
    const method: 'textDocument/rangeFormatting';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentRangeFormattingParams, TextEdit[] | null, never, void, DocumentRangeFormattingRegistrationOptions>;
}
/**
 * A request to format ranges in a document.
 *
 * @since 3.18.0
 * @proposed
 */
export declare namespace DocumentRangesFormattingRequest {
    const method: 'textDocument/rangesFormatting';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentRangesFormattingParams, TextEdit[] | null, never, void, DocumentRangeFormattingRegistrationOptions>;
}
/**
 * Client capabilities of a {@link DocumentOnTypeFormattingRequest}.
 */
export interface DocumentOnTypeFormattingClientCapabilities {
    /**
     * Whether on type formatting supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * The parameters of a {@link DocumentOnTypeFormattingRequest}.
 */
export interface DocumentOnTypeFormattingParams {
    /**
     * The document to format.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The position around which the on type formatting should happen.
     * This is not necessarily the exact position where the character denoted
     * by the property `ch` got typed.
     */
    position: Position;
    /**
     * The character that has been typed that triggered the formatting
     * on type request. That is not necessarily the last character that
     * got inserted into the document since the client could auto insert
     * characters as well (e.g. like automatic brace completion).
     */
    ch: string;
    /**
     * The formatting options.
     */
    options: FormattingOptions;
}
/**
 * Provider options for a {@link DocumentOnTypeFormattingRequest}.
 */
export interface DocumentOnTypeFormattingOptions {
    /**
     * A character on which formatting should be triggered, like `{`.
     */
    firstTriggerCharacter: string;
    /**
     * More trigger characters.
     */
    moreTriggerCharacter?: string[];
}
/**
 * Registration options for a {@link DocumentOnTypeFormattingRequest}.
 */
export interface DocumentOnTypeFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentOnTypeFormattingOptions {
}
/**
 * A request to format a document on type.
 */
export declare namespace DocumentOnTypeFormattingRequest {
    const method: 'textDocument/onTypeFormatting';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentOnTypeFormattingParams, TextEdit[] | null, never, void, DocumentOnTypeFormattingRegistrationOptions>;
}
export declare namespace PrepareSupportDefaultBehavior {
    /**
     * The client's default behavior is to select the identifier
     * according the to language's syntax rule.
     */
    const Identifier: 1;
}
export type PrepareSupportDefaultBehavior = 1;
export interface RenameClientCapabilities {
    /**
     * Whether rename supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Client supports testing for validity of rename operations
     * before execution.
     *
     * @since 3.12.0
     */
    prepareSupport?: boolean;
    /**
     * Client supports the default behavior result.
     *
     * The value indicates the default behavior used by the
     * client.
     *
     * @since 3.16.0
     */
    prepareSupportDefaultBehavior?: PrepareSupportDefaultBehavior;
    /**
     * Whether the client honors the change annotations in
     * text edits and resource operations returned via the
     * rename request's workspace edit by for example presenting
     * the workspace edit in the user interface and asking
     * for confirmation.
     *
     * @since 3.16.0
     */
    honorsChangeAnnotations?: boolean;
}
/**
 * The parameters of a {@link RenameRequest}.
 */
export interface RenameParams extends WorkDoneProgressParams {
    /**
     * The document to rename.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The position at which this request was sent.
     */
    position: Position;
    /**
     * The new name of the symbol. If the given name is not valid the
     * request must return a {@link ResponseError} with an
     * appropriate message set.
     */
    newName: string;
}
/**
 * Provider options for a {@link RenameRequest}.
 */
export interface RenameOptions extends WorkDoneProgressOptions {
    /**
     * Renames should be checked and tested before being executed.
     *
     * @since version 3.12.0
     */
    prepareProvider?: boolean;
}
/**
 * Registration options for a {@link RenameRequest}.
 */
export interface RenameRegistrationOptions extends TextDocumentRegistrationOptions, RenameOptions {
}
/**
 * A request to rename a symbol.
 */
export declare namespace RenameRequest {
    const method: 'textDocument/rename';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<RenameParams, WorkspaceEdit | null, never, void, RenameRegistrationOptions>;
}
export interface PrepareRenameParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
export type PrepareRenameResult = Range | {
    range: Range;
    placeholder: string;
} | {
    defaultBehavior: boolean;
};
/**
 * A request to test and perform the setup necessary for a rename.
 *
 * @since 3.16 - support for default behavior
 */
export declare namespace PrepareRenameRequest {
    const method: 'textDocument/prepareRename';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<PrepareRenameParams, PrepareRenameResult | null, never, void, void>;
}
/**
 * The client capabilities of a {@link ExecuteCommandRequest}.
 */
export interface ExecuteCommandClientCapabilities {
    /**
     * Execute command supports dynamic registration.
     */
    dynamicRegistration?: boolean;
}
/**
 * The parameters of a {@link ExecuteCommandRequest}.
 */
export interface ExecuteCommandParams extends WorkDoneProgressParams {
    /**
     * The identifier of the actual command handler.
     */
    command: string;
    /**
     * Arguments that the command should be invoked with.
     */
    arguments?: LSPAny[];
}
/**
 * The server capabilities of a {@link ExecuteCommandRequest}.
 */
export interface ExecuteCommandOptions extends WorkDoneProgressOptions {
    /**
     * The commands to be executed on the server
     */
    commands: string[];
}
/**
 * Registration options for a {@link ExecuteCommandRequest}.
 */
export interface ExecuteCommandRegistrationOptions extends ExecuteCommandOptions {
}
/**
 * A request send from the client to the server to execute a command. The request might return
 * a workspace edit which the client will apply to the workspace.
 */
export declare namespace ExecuteCommandRequest {
    const method: 'workspace/executeCommand';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ExecuteCommandParams, any, never, void, ExecuteCommandRegistrationOptions>;
}
export interface WorkspaceEditClientCapabilities {
    /**
     * The client supports versioned document changes in `WorkspaceEdit`s
     */
    documentChanges?: boolean;
    /**
     * The resource operations the client supports. Clients should at least
     * support 'create', 'rename' and 'delete' files and folders.
     *
     * @since 3.13.0
     */
    resourceOperations?: ResourceOperationKind[];
    /**
     * The failure handling strategy of a client if applying the workspace edit
     * fails.
     *
     * @since 3.13.0
     */
    failureHandling?: FailureHandlingKind;
    /**
     * Whether the client normalizes line endings to the client specific
     * setting.
     * If set to `true` the client will normalize line ending characters
     * in a workspace edit to the client-specified new line
     * character.
     *
     * @since 3.16.0
     */
    normalizesLineEndings?: boolean;
    /**
     * Whether the client in general supports change annotations on text edits,
     * create file, rename file and delete file changes.
     *
     * @since 3.16.0
     */
    changeAnnotationSupport?: {
        /**
         * Whether the client groups edits with equal labels into tree nodes,
         * for instance all edits labelled with "Changes in Strings" would
         * be a tree node.
         */
        groupsOnLabel?: boolean;
    };
}
/**
 * The parameters passed via an apply workspace edit request.
 */
export interface ApplyWorkspaceEditParams {
    /**
     * An optional label of the workspace edit. This label is
     * presented in the user interface for example on an undo
     * stack to undo the workspace edit.
     */
    label?: string;
    /**
     * The edits to apply.
     */
    edit: WorkspaceEdit;
}
/**
 * The result returned from the apply workspace edit request.
 *
 * @since 3.17 renamed from ApplyWorkspaceEditResponse
 */
export interface ApplyWorkspaceEditResult {
    /**
     * Indicates whether the edit was applied or not.
     */
    applied: boolean;
    /**
     * An optional textual description for why the edit was not applied.
     * This may be used by the server for diagnostic logging or to provide
     * a suitable error for a request that triggered the edit.
     */
    failureReason?: string;
    /**
     * Depending on the client's failure handling strategy `failedChange` might
     * contain the index of the change that failed. This property is only available
     * if the client signals a `failureHandlingStrategy` in its client capabilities.
     */
    failedChange?: uinteger;
}
/**
 * @deprecated Use ApplyWorkspaceEditResult instead.
 */
export type ApplyWorkspaceEditResponse = ApplyWorkspaceEditResult;
/**
 * A request sent from the server to the client to modified certain resources.
 */
export declare namespace ApplyWorkspaceEditRequest {
    const method: 'workspace/applyEdit';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ApplyWorkspaceEditParams, ApplyWorkspaceEditResult, never, void, void>;
}
export { ImplementationRequest, ImplementationParams, ImplementationRegistrationOptions, ImplementationOptions, TypeDefinitionRequest, TypeDefinitionParams, TypeDefinitionRegistrationOptions, TypeDefinitionOptions, WorkspaceFoldersRequest, DidChangeWorkspaceFoldersNotification, DidChangeWorkspaceFoldersParams, WorkspaceFoldersChangeEvent, ConfigurationRequest, ConfigurationParams, ConfigurationItem, DocumentColorRequest, ColorPresentationRequest, DocumentColorOptions, DocumentColorParams, ColorPresentationParams, DocumentColorRegistrationOptions, FoldingRangeClientCapabilities, FoldingRangeOptions, FoldingRangeRequest, FoldingRangeParams, FoldingRangeRegistrationOptions, FoldingRangeRefreshRequest, DeclarationClientCapabilities, DeclarationRequest, DeclarationParams, DeclarationRegistrationOptions, DeclarationOptions, SelectionRangeClientCapabilities, SelectionRangeOptions, SelectionRangeParams, SelectionRangeRequest, SelectionRangeRegistrationOptions, WorkDoneProgressBegin, WorkDoneProgressReport, WorkDoneProgressEnd, WorkDoneProgress, WorkDoneProgressCreateParams, WorkDoneProgressCreateRequest, WorkDoneProgressCancelParams, WorkDoneProgressCancelNotification, CallHierarchyClientCapabilities, CallHierarchyOptions, CallHierarchyRegistrationOptions, CallHierarchyIncomingCallsParams, CallHierarchyIncomingCallsRequest, CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCallsRequest, CallHierarchyPrepareParams, CallHierarchyPrepareRequest, SemanticTokensPartialResult, SemanticTokensDeltaPartialResult, TokenFormat, SemanticTokensClientCapabilities, SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensParams, SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest, SemanticTokensRefreshRequest, SemanticTokensRegistrationType, ShowDocumentParams, ShowDocumentRequest, ShowDocumentResult, ShowDocumentClientCapabilities, LinkedEditingRangeClientCapabilities, LinkedEditingRanges, LinkedEditingRangeOptions, LinkedEditingRangeParams, LinkedEditingRangeRegistrationOptions, LinkedEditingRangeRequest, FileOperationOptions, FileOperationClientCapabilities, FileOperationRegistrationOptions, FileOperationPatternOptions, FileOperationPatternKind, DidCreateFilesNotification, CreateFilesParams, FileCreate, WillCreateFilesRequest, DidRenameFilesNotification, RenameFilesParams, FileRename, WillRenameFilesRequest, DidDeleteFilesNotification, DeleteFilesParams, FileDelete, WillDeleteFilesRequest, UniquenessLevel, MonikerKind, Moniker, MonikerClientCapabilities, MonikerOptions, MonikerRegistrationOptions, MonikerParams, MonikerRequest, TypeHierarchyClientCapabilities, TypeHierarchyOptions, TypeHierarchyRegistrationOptions, TypeHierarchyPrepareParams, TypeHierarchyPrepareRequest, TypeHierarchySubtypesParams, TypeHierarchySubtypesRequest, TypeHierarchySupertypesParams, TypeHierarchySupertypesRequest, InlineValueClientCapabilities, InlineValueOptions, InlineValueRegistrationOptions, InlineValueWorkspaceClientCapabilities, InlineValueParams, InlineValueRequest, InlineValueRefreshRequest, InlayHintClientCapabilities, InlayHintOptions, InlayHintRegistrationOptions, InlayHintWorkspaceClientCapabilities, InlayHintParams, InlayHintRequest, InlayHintResolveRequest, InlayHintRefreshRequest, DiagnosticClientCapabilities, DiagnosticOptions, DiagnosticRegistrationOptions, DiagnosticServerCancellationData, DocumentDiagnosticParams, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport, RelatedFullDocumentDiagnosticReport, UnchangedDocumentDiagnosticReport, RelatedUnchangedDocumentDiagnosticReport, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DocumentDiagnosticRequest, PreviousResultId, WorkspaceDiagnosticParams, WorkspaceFullDocumentDiagnosticReport, WorkspaceUnchangedDocumentDiagnosticReport, WorkspaceDocumentDiagnosticReport, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, WorkspaceDiagnosticRequest, DiagnosticRefreshRequest, NotebookDocumentSyncClientCapabilities, NotebookCellKind, ExecutionSummary, NotebookCell, NotebookDocument, NotebookDocumentIdentifier, VersionedNotebookDocumentIdentifier, NotebookDocumentSyncOptions, NotebookDocumentSyncRegistrationOptions, NotebookDocumentSyncRegistrationType, DidOpenNotebookDocumentParams, DidOpenNotebookDocumentNotification, NotebookCellArrayChange, NotebookDocumentChangeEvent, DidChangeNotebookDocumentParams, DidChangeNotebookDocumentNotification, DidSaveNotebookDocumentParams, DidSaveNotebookDocumentNotification, DidCloseNotebookDocumentParams, DidCloseNotebookDocumentNotification, InlineCompletionClientCapabilities, InlineCompletionOptions, InlineCompletionParams, InlineCompletionRegistrationOptions, InlineCompletionRequest };
export { DocumentColorOptions as ColorProviderOptions, DocumentColorOptions as ColorOptions, FoldingRangeOptions as FoldingRangeProviderOptions, SelectionRangeOptions as SelectionRangeProviderOptions, DocumentColorRegistrationOptions as ColorRegistrationOptions };
