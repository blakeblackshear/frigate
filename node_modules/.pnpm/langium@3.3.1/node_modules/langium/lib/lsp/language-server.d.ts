/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CallHierarchyIncomingCallsParams, CallHierarchyOutgoingCallsParams, CancellationToken, Connection, Disposable, Event, HandlerResult, InitializedParams, InitializeParams, InitializeResult, RequestHandler, ServerRequestHandler, TextDocumentIdentifier, TypeHierarchySubtypesParams, TypeHierarchySupertypesParams } from 'vscode-languageserver';
import { Emitter } from 'vscode-languageserver-protocol';
import type { LangiumCoreServices } from '../services.js';
import { DocumentState, type LangiumDocument } from '../workspace/documents.js';
import type { LangiumSharedServices, PartialLangiumLSPServices } from './lsp-services.js';
export interface LanguageServer {
    initialize(params: InitializeParams): Promise<InitializeResult>;
    initialized(params: InitializedParams): void;
    onInitialize(callback: (params: InitializeParams) => void): Disposable;
    onInitialized(callback: (params: InitializedParams) => void): Disposable;
}
/**
 * Language-specific core and optional LSP services.
 * To be used while accessing the language-specific services via the service registry without a-priori knowledge about the presence of LSP services for the particular languages.
 * Shared services should be accessed via the language server's `services` property.
 */
export type LangiumCoreAndPartialLSPServices = Omit<LangiumCoreServices & PartialLangiumLSPServices, 'shared'>;
export declare class DefaultLanguageServer implements LanguageServer {
    protected onInitializeEmitter: Emitter<InitializeParams>;
    protected onInitializedEmitter: Emitter<InitializedParams>;
    protected readonly services: LangiumSharedServices;
    constructor(services: LangiumSharedServices);
    get onInitialize(): Event<InitializeParams>;
    get onInitialized(): Event<InitializedParams>;
    initialize(params: InitializeParams): Promise<InitializeResult>;
    /**
     * Eagerly loads all services before emitting the `onInitialize` event.
     * Ensures that all services are able to catch the event.
     */
    protected eagerLoadServices(): void;
    protected hasService(callback: (language: LangiumCoreAndPartialLSPServices) => object | undefined): boolean;
    protected buildInitializeResult(_params: InitializeParams): InitializeResult;
    initialized(params: InitializedParams): void;
    protected fireInitializeOnDefaultServices(params: InitializeParams): void;
    protected fireInitializedOnDefaultServices(params: InitializedParams): void;
}
export declare function startLanguageServer(services: LangiumSharedServices): void;
/**
 * Adds a handler for document updates when content changes, or watch catches a change.
 * In the case there is no handler service registered, this function does nothing.
 */
export declare function addDocumentUpdateHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addFileOperationHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addDiagnosticsHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addCompletionHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addFindReferencesHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addCodeActionHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addDocumentSymbolHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addGotoDefinitionHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addGoToTypeDefinitionHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addGoToImplementationHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addGoToDeclarationHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addDocumentHighlightsHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addHoverHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addFoldingRangeHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addFormattingHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addRenameHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addInlayHintHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addSemanticTokenHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addConfigurationChangeHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addExecuteCommandHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addDocumentLinkHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addSignatureHelpHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addCodeLensHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addWorkspaceSymbolHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addCallHierarchyHandler(connection: Connection, services: LangiumSharedServices): void;
export declare function addTypeHierarchyHandler(connection: Connection, sharedServices: LangiumSharedServices): void;
export declare function createHierarchyRequestHandler<P extends TypeHierarchySupertypesParams | TypeHierarchySubtypesParams | CallHierarchyIncomingCallsParams | CallHierarchyOutgoingCallsParams, R, PR, E = void>(serviceCall: (services: LangiumCoreAndPartialLSPServices, params: P, cancelToken: CancellationToken) => HandlerResult<R, E>, sharedServices: LangiumSharedServices): ServerRequestHandler<P, R, PR, E>;
export declare function createServerRequestHandler<P extends {
    textDocument: TextDocumentIdentifier;
}, R, PR, E = void>(serviceCall: (services: LangiumCoreAndPartialLSPServices, document: LangiumDocument, params: P, cancelToken: CancellationToken) => HandlerResult<R, E>, sharedServices: LangiumSharedServices, targetState?: DocumentState): ServerRequestHandler<P, R, PR, E>;
export declare function createRequestHandler<P extends {
    textDocument: TextDocumentIdentifier;
}, R, E = void>(serviceCall: (services: LangiumCoreAndPartialLSPServices, document: LangiumDocument, params: P, cancelToken: CancellationToken) => HandlerResult<R, E>, sharedServices: LangiumSharedServices, targetState?: DocumentState): RequestHandler<P, R | null, E>;
//# sourceMappingURL=language-server.d.ts.map