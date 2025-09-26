import { CancellationToken, ProtocolRequestType0, RequestHandler0, ProtocolRequestType, RequestHandler, GenericRequestHandler, StarRequestHandler, HandlerResult, ProtocolNotificationType0, NotificationHandler0, ProtocolNotificationType, NotificationHandler, GenericNotificationHandler, StarNotificationHandler, ProgressType, Disposable, InitializeParams, InitializeResult, InitializeError, InitializedParams, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DidOpenTextDocumentParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, WillSaveTextDocumentParams, TextEdit, DidSaveTextDocumentParams, PublishDiagnosticsParams, HoverParams, Hover, CompletionParams, CompletionItem, CompletionList, SignatureHelpParams, SignatureHelp, DeclarationParams, Declaration, DeclarationLink, Location, DefinitionParams, Definition, DefinitionLink, TypeDefinitionParams, ImplementationParams, ReferenceParams, DocumentHighlightParams, DocumentHighlight, DocumentSymbolParams, SymbolInformation, DocumentSymbol, WorkspaceSymbolParams, CodeActionParams, Command, CodeAction, CodeLensParams, CodeLens, DocumentFormattingParams, DocumentRangeFormattingParams, DocumentOnTypeFormattingParams, RenameParams, WorkspaceEdit, PrepareRenameParams, Range, DocumentLinkParams, DocumentLink, DocumentColorParams, ColorInformation, ColorPresentationParams, ColorPresentation, FoldingRangeParams, FoldingRange, SelectionRangeParams, SelectionRange, ExecuteCommandParams, MessageActionItem, ClientCapabilities, ServerCapabilities, Logger, ProtocolConnection, MessageSignature, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse, WorkDoneProgressParams, PartialResultParams, RegistrationType, RequestType0, RequestType, NotificationType0, NotificationType, WorkspaceSymbol } from 'vscode-languageserver-protocol';
import { WorkDoneProgressReporter, ResultProgressReporter, WindowProgress } from './progress';
import { Configuration } from './configuration';
import { WorkspaceFolders } from './workspaceFolder';
import { CallHierarchy } from './callHierarchy';
import { SemanticTokensFeatureShape } from './semanticTokens';
import { ShowDocumentFeatureShape } from './showDocument';
import { FileOperationsFeatureShape } from './fileOperations';
import { LinkedEditingRangeFeatureShape } from './linkedEditingRange';
import { TypeHierarchyFeatureShape } from './typeHierarchy';
import { InlineValueFeatureShape } from './inlineValue';
import { FoldingRangeFeatureShape } from './foldingRange';
import { InlayHintFeatureShape } from './inlayHint';
import { DiagnosticFeatureShape } from './diagnostic';
import { NotebookSyncFeatureShape } from './notebook';
import { MonikerFeatureShape } from './moniker';
/**
 * Helps tracking error message. Equal occurrences of the same
 * message are only stored once. This class is for example
 * useful if text documents are validated in a loop and equal
 * error message should be folded into one.
 */
export declare class ErrorMessageTracker {
    private _messages;
    constructor();
    /**
     * Add a message to the tracker.
     *
     * @param message The message to add.
     */
    add(message: string): void;
    /**
     * Send all tracked messages to the connection's window.
     *
     * @param connection The connection established between client and server.
     */
    sendErrors(connection: {
        window: RemoteWindow;
    }): void;
}
export interface FeatureBase {
    /**
     * Called to initialize the remote with the given
     * client capabilities
     *
     * @param capabilities The client capabilities
     */
    initialize(capabilities: ClientCapabilities): void;
    /**
     * Called to fill in the server capabilities this feature implements.
     *
     * @param capabilities The server capabilities to fill.
     */
    fillServerCapabilities(capabilities: ServerCapabilities): void;
}
interface Remote extends FeatureBase {
    /**
     * Attach the remote to the given connection.
     *
     * @param connection The connection this remote is operating on.
     */
    attach(connection: Connection): void;
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
}
/**
 * The RemoteConsole interface contains all functions to interact with
 * the tools / clients console or log system. Internally it used `window/logMessage`
 * notifications.
 */
export interface RemoteConsole extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Show an error message.
     *
     * @param message The message to show.
     */
    error(message: string): void;
    /**
     * Show a warning message.
     *
     * @param message The message to show.
     */
    warn(message: string): void;
    /**
     * Show an information message.
     *
     * @param message The message to show.
     */
    info(message: string): void;
    /**
     * Log a message.
     *
     * @param message The message to log.
     */
    log(message: string): void;
    /**
     * Log a debug message.
     *
     * @param message The message to log.
     *
     * @since 3.18.0
     */
    debug(message: string): void;
}
/**
 * The RemoteWindow interface contains all functions to interact with
 * the visual window of VS Code.
 */
export interface _RemoteWindow extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Shows an error message in the client's user interface. Depending on the client this might
     * be a modal dialog with a confirmation button or a notification in a notification center
     *
     * @param message The message to show.
     * @param actions Possible additional actions presented in the user interface. The selected action
     *  will be the value of the resolved promise
     */
    showErrorMessage(message: string): void;
    showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;
    /**
     * Shows a warning message in the client's user interface. Depending on the client this might
     * be a modal dialog with a confirmation button or a notification in a notification center
     *
     * @param message The message to show.
     * @param actions Possible additional actions presented in the user interface. The selected action
     *  will be the value of the resolved promise
     */
    showWarningMessage(message: string): void;
    showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;
    /**
     * Shows an information message in the client's user interface. Depending on the client this might
     * be a modal dialog with a confirmation button or a notification in a notification center
     *
     * @param message The message to show.
     * @param actions Possible additional actions presented in the user interface. The selected action
     *  will be the value of the resolved promise
     */
    showInformationMessage(message: string): void;
    showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;
}
export type RemoteWindow = _RemoteWindow & WindowProgress & ShowDocumentFeatureShape;
/**
 * A bulk registration manages n single registration to be able to register
 * for n notifications or requests using one register request.
 */
export interface BulkRegistration {
    /**
     * Adds a single registration.
     * @param type the notification type to register for.
     * @param registerParams special registration parameters.
     */
    add<RO>(type: ProtocolNotificationType0<RO>, registerParams: RO): void;
    add<P, RO>(type: ProtocolNotificationType<P, RO>, registerParams: RO): void;
    /**
     * Adds a single registration.
     * @param type the request type to register for.
     * @param registerParams special registration parameters.
     */
    add<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, registerParams: RO): void;
    add<P, PR, R, E, RO>(type: ProtocolRequestType<P, PR, R, E, RO>, registerParams: RO): void;
    /**
     * Adds a single registration.
     * @param type the notification type to register for.
     * @param registerParams special registration parameters.
     */
    add<RO>(type: RegistrationType<RO>, registerParams: RO): void;
}
export declare namespace BulkRegistration {
    /**
     * Creates a new bulk registration.
     * @return an empty bulk registration.
     */
    function create(): BulkRegistration;
}
/**
 * A `BulkUnregistration` manages n unregistrations.
 */
export interface BulkUnregistration extends Disposable {
    /**
     * Disposes a single registration. It will be removed from the
     * `BulkUnregistration`.
     */
    disposeSingle(arg: string | MessageSignature): boolean;
}
export declare namespace BulkUnregistration {
    function create(): BulkUnregistration;
}
/**
 * Interface to register and unregister `listeners` on the client / tools side.
 */
export interface RemoteClient extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Registers a listener for the given request.
     *
     * @param type the request type to register for.
     * @param registerParams special registration parameters.
     * @return a `Disposable` to unregister the listener again.
     */
    register<P, RO>(type: ProtocolNotificationType<P, RO>, registerParams?: RO): Promise<Disposable>;
    register<RO>(type: ProtocolNotificationType0<RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a listener for the given request.
     *
     * @param unregisteration the unregistration to add a corresponding unregister action to.
     * @param type the request type to register for.
     * @param registerParams special registration parameters.
     * @return the updated unregistration.
     */
    register<P, RO>(unregisteration: BulkUnregistration, type: ProtocolNotificationType<P, RO>, registerParams?: RO): Promise<Disposable>;
    register<RO>(unregisteration: BulkUnregistration, type: ProtocolNotificationType0<RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a listener for the given request.
     *
     * @param type the request type to register for.
     * @param registerParams special registration parameters.
     * @return a `Disposable` to unregister the listener again.
     */
    register<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
    register<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a listener for the given request.
     *
     * @param unregisteration the unregistration to add a corresponding unregister action to.
     * @param type the request type to register for.
     * @param registerParams special registration parameters.
     * @return the updated unregistration.
     */
    register<P, R, PR, E, RO>(unregisteration: BulkUnregistration, type: ProtocolRequestType<P, R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
    register<R, PR, E, RO>(unregisteration: BulkUnregistration, type: ProtocolRequestType0<R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a listener for the given registration type.
     *
     * @param type the registration type.
     * @param registerParams special registration parameters.
     * @return a `Disposable` to unregister the listener again.
     */
    register<RO>(type: RegistrationType<RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a listener for the given registration type.
     *
     * @param unregisteration the unregistration to add a corresponding unregister action to.
     * @param type the registration type.
     * @param registerParams special registration parameters.
     * @return the updated unregistration.
     */
    register<RO>(unregisteration: BulkUnregistration, type: RegistrationType<RO>, registerParams?: RO): Promise<Disposable>;
    /**
     * Registers a set of listeners.
     * @param registrations the bulk registration
     * @return a `Disposable` to unregister the listeners again.
     */
    register(registrations: BulkRegistration): Promise<BulkUnregistration>;
}
/**
 * Represents the workspace managed by the client.
 */
export interface _RemoteWorkspace extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Applies a `WorkspaceEdit` to the workspace
     * @param param the workspace edit params.
     * @return a thenable that resolves to the `ApplyWorkspaceEditResponse`.
     */
    applyEdit(paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit): Promise<ApplyWorkspaceEditResponse>;
}
export type RemoteWorkspace = _RemoteWorkspace & Configuration & WorkspaceFolders & FileOperationsFeatureShape;
/**
 * Interface to log telemetry events. The events are actually send to the client
 * and the client needs to feed the event into a proper telemetry system.
 */
export interface Telemetry extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Log the given data to telemetry.
     *
     * @param data The data to log. Must be a JSON serializable object.
     */
    logEvent(data: any): void;
}
/**
 * Interface to log traces to the client. The events are sent to the client and the
 * client needs to log the trace events.
 */
export interface RemoteTracer extends FeatureBase {
    /**
     * The connection this remote is attached to.
     */
    connection: Connection;
    /**
     * Log the given data to the trace Log
     */
    log(message: string, verbose?: string): void;
}
export interface _Languages extends FeatureBase {
    connection: Connection;
    attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
    attachPartialResultProgress<PR>(type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}
export declare class _LanguagesImpl implements Remote, _Languages {
    private _connection;
    constructor();
    attach(connection: Connection): void;
    get connection(): Connection;
    initialize(_capabilities: ClientCapabilities): void;
    fillServerCapabilities(_capabilities: ServerCapabilities): void;
    attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
    attachPartialResultProgress<PR>(_type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}
export type Languages = _Languages & CallHierarchy & SemanticTokensFeatureShape & LinkedEditingRangeFeatureShape & TypeHierarchyFeatureShape & InlineValueFeatureShape & InlayHintFeatureShape & DiagnosticFeatureShape & MonikerFeatureShape & FoldingRangeFeatureShape;
export interface _Notebooks extends FeatureBase {
    connection: Connection;
    attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
    attachPartialResultProgress<PR>(type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}
export declare class _NotebooksImpl implements Remote, _Notebooks {
    private _connection;
    constructor();
    attach(connection: Connection): void;
    get connection(): Connection;
    initialize(_capabilities: ClientCapabilities): void;
    fillServerCapabilities(_capabilities: ServerCapabilities): void;
    attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
    attachPartialResultProgress<PR>(_type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}
export type Notebooks = _Notebooks & NotebookSyncFeatureShape;
/**
 * An empty interface for new proposed API.
 */
export interface _ {
}
export interface ServerRequestHandler<P, R, PR, E> {
    (params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
}
/**
 * Interface to describe the shape of the server connection.
 */
export interface _Connection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _> {
    /**
     * Start listening on the input stream for messages to process.
     */
    listen(): void;
    /**
     * Installs a request handler described by the given {@link RequestType}.
     *
     * @param type The {@link RequestType} describing the request.
     * @param handler The handler to install
     */
    onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
    onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
    onRequest<R, PR, E, RO>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
    onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
    /**
     * Installs a request handler for the given method.
     *
     * @param method The method to register a request handler for.
     * @param handler The handler to install.
     */
    onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
    /**
     * Installs a request handler that is invoked if no specific request handler can be found.
     *
     * @param handler a handler that handles all requests.
     */
    onRequest(handler: StarRequestHandler): Disposable;
    /**
     * Send a request to the client.
     *
     * @param type The {@link RequestType} describing the request.
     * @param params The request's parameters.
     */
    sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
    sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
    sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
    sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
    /**
     * Send a request to the client.
     *
     * @param method The method to invoke on the client.
     * @param params The request's parameters.
     */
    sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
    sendRequest<R>(method: string, params: any, token?: CancellationToken): Promise<R>;
    /**
     * Installs a notification handler described by the given {@link NotificationType}.
     *
     * @param type The {@link NotificationType} describing the notification.
     * @param handler The handler to install.
     */
    onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
    onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
    onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
    onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
    /**
     * Installs a notification handler for the given method.
     *
     * @param method The method to register a request handler for.
     * @param handler The handler to install.
     */
    onNotification(method: string, handler: GenericNotificationHandler): Disposable;
    /**
     * Installs a notification handler that is invoked if no specific notification handler can be found.
     *
     * @param handler a handler that handles all notifications.
     */
    onNotification(handler: StarNotificationHandler): Disposable;
    /**
     * Send a notification to the client.
     *
     * @param type The {@link NotificationType} describing the notification.
     * @param params The notification's parameters.
     */
    sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
    sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params: P): Promise<void>;
    sendNotification(type: NotificationType0): Promise<void>;
    sendNotification<P>(type: NotificationType<P>, params: P): Promise<void>;
    /**
     * Send a notification to the client.
     *
     * @param method The method to invoke on the client.
     * @param params The notification's parameters.
     */
    sendNotification(method: string, params?: any): Promise<void>;
    /**
     * Installs a progress handler for a given token.
     * @param type the progress type
     * @param token the token
     * @param handler the handler
     */
    onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
    /**
     * Sends progress.
     * @param type the progress type
     * @param token the token to use
     * @param value the progress value
     */
    sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void>;
    /**
     * Installs a handler for the initialize request.
     *
     * @param handler The initialize handler.
     */
    onInitialize(handler: ServerRequestHandler<InitializeParams, InitializeResult, never, InitializeError>): Disposable;
    /**
     * Installs a handler for the initialized notification.
     *
     * @param handler The initialized handler.
     */
    onInitialized(handler: NotificationHandler<InitializedParams>): Disposable;
    /**
     * Installs a handler for the shutdown request.
     *
     * @param handler The initialize handler.
     */
    onShutdown(handler: RequestHandler0<void, void>): Disposable;
    /**
     * Installs a handler for the exit notification.
     *
     * @param handler The exit handler.
     */
    onExit(handler: NotificationHandler0): Disposable;
    /**
     * A property to provide access to console specific features.
     */
    console: RemoteConsole & PConsole;
    /**
     * A property to provide access to tracer specific features.
     */
    tracer: RemoteTracer & PTracer;
    /**
     * A property to provide access to telemetry specific features.
     */
    telemetry: Telemetry & PTelemetry;
    /**
     * A property to provide access to client specific features like registering
     * for requests or notifications.
     */
    client: RemoteClient & PClient;
    /**
     * A property to provide access to windows specific features.
     */
    window: RemoteWindow & PWindow;
    /**
     * A property to provide access to workspace specific features.
     */
    workspace: RemoteWorkspace & PWorkspace;
    /**
     * A property to provide access to language specific features.
     */
    languages: Languages & PLanguages;
    /**
     * A property to provide access to notebook specific features.
     */
    notebooks: Notebooks & PNotebooks;
    /**
     * Installs a handler for the `DidChangeConfiguration` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): Disposable;
    /**
     * Installs a handler for the `DidChangeWatchedFiles` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidChangeWatchedFiles(handler: NotificationHandler<DidChangeWatchedFilesParams>): Disposable;
    /**
     * Installs a handler for the `DidOpenTextDocument` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): Disposable;
    /**
     * Installs a handler for the `DidChangeTextDocument` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): Disposable;
    /**
     * Installs a handler for the `DidCloseTextDocument` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): Disposable;
    /**
     * Installs a handler for the `WillSaveTextDocument` notification.
     *
     * Note that this notification is opt-in. The client will not send it unless
     * your server has the `textDocumentSync.willSave` capability or you've
     * dynamically registered for the `textDocument/willSave` method.
     *
     * @param handler The corresponding handler.
     */
    onWillSaveTextDocument(handler: NotificationHandler<WillSaveTextDocumentParams>): Disposable;
    /**
     * Installs a handler for the `WillSaveTextDocumentWaitUntil` request.
     *
     * Note that this request is opt-in. The client will not send it unless
     * your server has the `textDocumentSync.willSaveWaitUntil` capability,
     * or you've dynamically registered for the `textDocument/willSaveWaitUntil`
     * method.
     *
     * @param handler The corresponding handler.
     */
    onWillSaveTextDocumentWaitUntil(handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[] | undefined | null, void>): Disposable;
    /**
     * Installs a handler for the `DidSaveTextDocument` notification.
     *
     * @param handler The corresponding handler.
     */
    onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): Disposable;
    /**
     * Sends diagnostics computed for a given document to VSCode to render them in the
     * user interface.
     *
     * @param params The diagnostic parameters.
     */
    sendDiagnostics(params: PublishDiagnosticsParams): Promise<void>;
    /**
     * Installs a handler for the `Hover` request.
     *
     * @param handler The corresponding handler.
     */
    onHover(handler: ServerRequestHandler<HoverParams, Hover | undefined | null, never, void>): Disposable;
    /**
     * Installs a handler for the `Completion` request.
     *
     * @param handler The corresponding handler.
     */
    onCompletion(handler: ServerRequestHandler<CompletionParams, CompletionItem[] | CompletionList | undefined | null, CompletionItem[], void>): Disposable;
    /**
     * Installs a handler for the `CompletionResolve` request.
     *
     * @param handler The corresponding handler.
     */
    onCompletionResolve(handler: RequestHandler<CompletionItem, CompletionItem, void>): Disposable;
    /**
     * Installs a handler for the `SignatureHelp` request.
     *
     * @param handler The corresponding handler.
     */
    onSignatureHelp(handler: ServerRequestHandler<SignatureHelpParams, SignatureHelp | undefined | null, never, void>): Disposable;
    /**
     * Installs a handler for the `Declaration` request.
     *
     * @param handler The corresponding handler.
     */
    onDeclaration(handler: ServerRequestHandler<DeclarationParams, Declaration | DeclarationLink[] | undefined | null, Location[] | DeclarationLink[], void>): Disposable;
    /**
     * Installs a handler for the `Definition` request.
     *
     * @param handler The corresponding handler.
     */
    onDefinition(handler: ServerRequestHandler<DefinitionParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;
    /**
     * Installs a handler for the `Type Definition` request.
     *
     * @param handler The corresponding handler.
     */
    onTypeDefinition(handler: ServerRequestHandler<TypeDefinitionParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;
    /**
     * Installs a handler for the `Implementation` request.
     *
     * @param handler The corresponding handler.
     */
    onImplementation(handler: ServerRequestHandler<ImplementationParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;
    /**
     * Installs a handler for the `References` request.
     *
     * @param handler The corresponding handler.
     */
    onReferences(handler: ServerRequestHandler<ReferenceParams, Location[] | undefined | null, Location[], void>): Disposable;
    /**
     * Installs a handler for the `DocumentHighlight` request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentHighlight(handler: ServerRequestHandler<DocumentHighlightParams, DocumentHighlight[] | undefined | null, DocumentHighlight[], void>): Disposable;
    /**
     * Installs a handler for the `DocumentSymbol` request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentSymbol(handler: ServerRequestHandler<DocumentSymbolParams, SymbolInformation[] | DocumentSymbol[] | undefined | null, SymbolInformation[] | DocumentSymbol[], void>): Disposable;
    /**
     * Installs a handler for the `WorkspaceSymbol` request.
     *
     * @param handler The corresponding handler.
     */
    onWorkspaceSymbol(handler: ServerRequestHandler<WorkspaceSymbolParams, SymbolInformation[] | WorkspaceSymbol[] | undefined | null, SymbolInformation[], void>): Disposable;
    /**
     * Installs a handler for the `WorkspaceSymbol` request.
     *
     * @param handler The corresponding handler.
     */
    onWorkspaceSymbolResolve(handler: RequestHandler<WorkspaceSymbol, WorkspaceSymbol, void>): Disposable;
    /**
     * Installs a handler for the `CodeAction` request.
     *
     * @param handler The corresponding handler.
     */
    onCodeAction(handler: ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void>): Disposable;
    /**
     * Installs a handler for the `CodeAction` resolve request.
     *
     * @param handler The corresponding handler.
     */
    onCodeActionResolve(handler: RequestHandler<CodeAction, CodeAction, void>): Disposable;
    /**
     * Compute a list of {@link CodeLens lenses}. This call should return as fast as possible and if
     * computing the commands is expensive implementers should only return code lens objects with the
     * range set and handle the resolve request.
     *
     * @param handler The corresponding handler.
     */
    onCodeLens(handler: ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void>): Disposable;
    /**
     * This function will be called for each visible code lens, usually when scrolling and after
     * the onCodeLens has been called.
     *
     * @param handler The corresponding handler.
     */
    onCodeLensResolve(handler: RequestHandler<CodeLens, CodeLens, void>): Disposable;
    /**
     * Installs a handler for the document formatting request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentFormatting(handler: ServerRequestHandler<DocumentFormattingParams, TextEdit[] | undefined | null, never, void>): Disposable;
    /**
     * Installs a handler for the document range formatting request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentRangeFormatting(handler: ServerRequestHandler<DocumentRangeFormattingParams, TextEdit[] | undefined | null, never, void>): Disposable;
    /**
     * Installs a handler for the document on type formatting request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentOnTypeFormatting(handler: RequestHandler<DocumentOnTypeFormattingParams, TextEdit[] | undefined | null, void>): Disposable;
    /**
     * Installs a handler for the rename request.
     *
     * @param handler The corresponding handler.
     */
    onRenameRequest(handler: ServerRequestHandler<RenameParams, WorkspaceEdit | undefined | null, never, void>): Disposable;
    /**
     * Installs a handler for the prepare rename request.
     *
     * @param handler The corresponding handler.
     */
    onPrepareRename(handler: RequestHandler<PrepareRenameParams, Range | {
        range: Range;
        placeholder: string;
    } | {
        defaultBehavior: boolean;
    } | undefined | null, void>): Disposable;
    /**
     * Installs a handler for the document links request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentLinks(handler: ServerRequestHandler<DocumentLinkParams, DocumentLink[] | undefined | null, DocumentLink[], void>): Disposable;
    /**
     * Installs a handler for the document links resolve request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentLinkResolve(handler: RequestHandler<DocumentLink, DocumentLink | undefined | null, void>): Disposable;
    /**
     * Installs a handler for the document color request.
     *
     * @param handler The corresponding handler.
     */
    onDocumentColor(handler: ServerRequestHandler<DocumentColorParams, ColorInformation[] | undefined | null, ColorInformation[], void>): Disposable;
    /**
     * Installs a handler for the document color request.
     *
     * @param handler The corresponding handler.
     */
    onColorPresentation(handler: ServerRequestHandler<ColorPresentationParams, ColorPresentation[] | undefined | null, ColorPresentation[], void>): Disposable;
    /**
     * Installs a handler for the folding ranges request.
     *
     * @param handler The corresponding handler.
     */
    onFoldingRanges(handler: ServerRequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, FoldingRange[], void>): Disposable;
    /**
     * Installs a handler for the selection ranges request.
     *
     * @param handler The corresponding handler.
     */
    onSelectionRanges(handler: ServerRequestHandler<SelectionRangeParams, SelectionRange[] | undefined | null, SelectionRange[], void>): Disposable;
    /**
     * Installs a handler for the execute command request.
     *
     * @param handler The corresponding handler.
     */
    onExecuteCommand(handler: ServerRequestHandler<ExecuteCommandParams, any | undefined | null, never, void>): Disposable;
    /**
     * Disposes the connection
     */
    dispose(): void;
}
export interface Connection extends _Connection {
}
export interface Feature<B extends FeatureBase, P> {
    (Base: new () => B): new () => B & P;
}
export type ConsoleFeature<P> = Feature<RemoteConsole, P>;
export declare function combineConsoleFeatures<O, T>(one: ConsoleFeature<O>, two: ConsoleFeature<T>): ConsoleFeature<O & T>;
export type TelemetryFeature<P> = Feature<Telemetry, P>;
export declare function combineTelemetryFeatures<O, T>(one: TelemetryFeature<O>, two: TelemetryFeature<T>): TelemetryFeature<O & T>;
export type TracerFeature<P> = Feature<RemoteTracer, P>;
export declare function combineTracerFeatures<O, T>(one: TracerFeature<O>, two: TracerFeature<T>): TracerFeature<O & T>;
export type ClientFeature<P> = Feature<RemoteClient, P>;
export declare function combineClientFeatures<O, T>(one: ClientFeature<O>, two: ClientFeature<T>): ClientFeature<O & T>;
export type WindowFeature<P> = Feature<_RemoteWindow, P>;
export declare function combineWindowFeatures<O, T>(one: WindowFeature<O>, two: WindowFeature<T>): WindowFeature<O & T>;
export type WorkspaceFeature<P> = Feature<_RemoteWorkspace, P>;
export declare function combineWorkspaceFeatures<O, T>(one: WorkspaceFeature<O>, two: WorkspaceFeature<T>): WorkspaceFeature<O & T>;
export type LanguagesFeature<P> = Feature<_Languages, P>;
export declare function combineLanguagesFeatures<O, T>(one: LanguagesFeature<O>, two: LanguagesFeature<T>): LanguagesFeature<O & T>;
export type NotebooksFeature<P> = Feature<_Notebooks, P>;
export declare function combineNotebooksFeatures<O, T>(one: NotebooksFeature<O>, two: NotebooksFeature<T>): NotebooksFeature<O & T>;
export interface Features<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _> {
    __brand: 'features';
    console?: ConsoleFeature<PConsole>;
    tracer?: TracerFeature<PTracer>;
    telemetry?: TelemetryFeature<PTelemetry>;
    client?: ClientFeature<PClient>;
    window?: WindowFeature<PWindow>;
    workspace?: WorkspaceFeature<PWorkspace>;
    languages?: LanguagesFeature<PLanguages>;
    notebooks?: NotebooksFeature<PNotebooks>;
}
export declare function combineFeatures<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace, OLanguages, ONotebooks, TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace, TLanguages, TNotebooks>(one: Features<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace, OLanguages, ONotebooks>, two: Features<TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace, TLanguages, TNotebooks>): Features<OConsole & TConsole, OTracer & TTracer, OTelemetry & TTelemetry, OClient & TClient, OWindow & TWindow, OWorkspace & TWorkspace, OLanguages & TLanguages, ONotebooks & TNotebooks>;
export interface WatchDog {
    shutdownReceived: boolean;
    initialize(params: InitializeParams): void;
    exit(code: number): void;
}
export declare function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _>(connectionFactory: (logger: Logger) => ProtocolConnection, watchDog: WatchDog, factories?: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>;
export {};
