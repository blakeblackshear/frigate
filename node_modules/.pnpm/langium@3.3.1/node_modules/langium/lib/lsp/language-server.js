/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { DidChangeConfigurationNotification, Emitter, LSPErrorCodes, ResponseError, TextDocumentSyncKind } from 'vscode-languageserver-protocol';
import { eagerLoad } from '../dependency-injection.js';
import { isOperationCancelled } from '../utils/promise-utils.js';
import { URI } from '../utils/uri-utils.js';
import { DocumentState } from '../workspace/documents.js';
import { mergeCompletionProviderOptions } from './completion/completion-provider.js';
import { mergeSemanticTokenProviderOptions } from './semantic-token-provider.js';
import { mergeSignatureHelpOptions } from './signature-help-provider.js';
export class DefaultLanguageServer {
    constructor(services) {
        this.onInitializeEmitter = new Emitter();
        this.onInitializedEmitter = new Emitter();
        this.services = services;
    }
    get onInitialize() {
        return this.onInitializeEmitter.event;
    }
    get onInitialized() {
        return this.onInitializedEmitter.event;
    }
    async initialize(params) {
        this.eagerLoadServices();
        this.fireInitializeOnDefaultServices(params);
        this.onInitializeEmitter.fire(params);
        this.onInitializeEmitter.dispose();
        return this.buildInitializeResult(params);
    }
    /**
     * Eagerly loads all services before emitting the `onInitialize` event.
     * Ensures that all services are able to catch the event.
     */
    eagerLoadServices() {
        eagerLoad(this.services);
        this.services.ServiceRegistry.all.forEach(language => eagerLoad(language));
    }
    hasService(callback) {
        const allServices = this.services.ServiceRegistry.all;
        return allServices.some(services => callback(services) !== undefined);
    }
    buildInitializeResult(_params) {
        var _a, _b, _c, _d;
        const documentUpdateHandler = this.services.lsp.DocumentUpdateHandler;
        const fileOperationOptions = (_a = this.services.lsp.FileOperationHandler) === null || _a === void 0 ? void 0 : _a.fileOperationOptions;
        const allServices = this.services.ServiceRegistry.all;
        const hasFormattingService = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.Formatter; });
        const formattingOnTypeOptions = allServices.map(e => { var _a, _b; return (_b = (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.Formatter) === null || _b === void 0 ? void 0 : _b.formatOnTypeOptions; }).find(e => Boolean(e));
        const hasCodeActionProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.CodeActionProvider; });
        const hasSemanticTokensProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.SemanticTokenProvider; });
        const semanticTokensOptions = mergeSemanticTokenProviderOptions(allServices.map(e => { var _a, _b; return (_b = (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.SemanticTokenProvider) === null || _b === void 0 ? void 0 : _b.semanticTokensOptions; }));
        const commandNames = (_c = (_b = this.services.lsp) === null || _b === void 0 ? void 0 : _b.ExecuteCommandHandler) === null || _c === void 0 ? void 0 : _c.commands;
        const hasDocumentLinkProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.DocumentLinkProvider; });
        const signatureHelpOptions = mergeSignatureHelpOptions(allServices.map(e => { var _a, _b; return (_b = (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.SignatureHelp) === null || _b === void 0 ? void 0 : _b.signatureHelpOptions; }));
        const hasGoToTypeProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.TypeProvider; });
        const hasGoToImplementationProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.ImplementationProvider; });
        const hasCompletionProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.CompletionProvider; });
        const completionOptions = mergeCompletionProviderOptions(allServices.map(e => { var _a, _b; return (_b = (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.CompletionProvider) === null || _b === void 0 ? void 0 : _b.completionOptions; }));
        const hasReferencesProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.ReferencesProvider; });
        const hasDocumentSymbolProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.DocumentSymbolProvider; });
        const hasDefinitionProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.DefinitionProvider; });
        const hasDocumentHighlightProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.DocumentHighlightProvider; });
        const hasFoldingRangeProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.FoldingRangeProvider; });
        const hasHoverProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.HoverProvider; });
        const hasRenameProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.RenameProvider; });
        const hasCallHierarchyProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.CallHierarchyProvider; });
        const hasTypeHierarchyProvider = this.hasService((e) => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.TypeHierarchyProvider; });
        const hasCodeLensProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.CodeLensProvider; });
        const hasDeclarationProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.DeclarationProvider; });
        const hasInlayHintProvider = this.hasService(e => { var _a; return (_a = e.lsp) === null || _a === void 0 ? void 0 : _a.InlayHintProvider; });
        const workspaceSymbolProvider = (_d = this.services.lsp) === null || _d === void 0 ? void 0 : _d.WorkspaceSymbolProvider;
        const result = {
            capabilities: {
                workspace: {
                    workspaceFolders: {
                        supported: true
                    },
                    fileOperations: fileOperationOptions
                },
                executeCommandProvider: commandNames && {
                    commands: commandNames
                },
                textDocumentSync: {
                    change: TextDocumentSyncKind.Incremental,
                    openClose: true,
                    save: Boolean(documentUpdateHandler.didSaveDocument),
                    willSave: Boolean(documentUpdateHandler.willSaveDocument),
                    willSaveWaitUntil: Boolean(documentUpdateHandler.willSaveDocumentWaitUntil)
                },
                completionProvider: hasCompletionProvider ? completionOptions : undefined,
                referencesProvider: hasReferencesProvider,
                documentSymbolProvider: hasDocumentSymbolProvider,
                definitionProvider: hasDefinitionProvider,
                typeDefinitionProvider: hasGoToTypeProvider,
                documentHighlightProvider: hasDocumentHighlightProvider,
                codeActionProvider: hasCodeActionProvider,
                documentFormattingProvider: hasFormattingService,
                documentRangeFormattingProvider: hasFormattingService,
                documentOnTypeFormattingProvider: formattingOnTypeOptions,
                foldingRangeProvider: hasFoldingRangeProvider,
                hoverProvider: hasHoverProvider,
                renameProvider: hasRenameProvider ? {
                    prepareProvider: true
                } : undefined,
                semanticTokensProvider: hasSemanticTokensProvider
                    ? semanticTokensOptions
                    : undefined,
                signatureHelpProvider: signatureHelpOptions,
                implementationProvider: hasGoToImplementationProvider,
                callHierarchyProvider: hasCallHierarchyProvider
                    ? {}
                    : undefined,
                typeHierarchyProvider: hasTypeHierarchyProvider
                    ? {}
                    : undefined,
                documentLinkProvider: hasDocumentLinkProvider
                    ? { resolveProvider: false }
                    : undefined,
                codeLensProvider: hasCodeLensProvider
                    ? { resolveProvider: false }
                    : undefined,
                declarationProvider: hasDeclarationProvider,
                inlayHintProvider: hasInlayHintProvider
                    ? { resolveProvider: false }
                    : undefined,
                workspaceSymbolProvider: workspaceSymbolProvider
                    ? { resolveProvider: Boolean(workspaceSymbolProvider.resolveSymbol) }
                    : undefined
            }
        };
        return result;
    }
    initialized(params) {
        this.fireInitializedOnDefaultServices(params);
        this.onInitializedEmitter.fire(params);
        this.onInitializedEmitter.dispose();
    }
    fireInitializeOnDefaultServices(params) {
        this.services.workspace.ConfigurationProvider.initialize(params);
        this.services.workspace.WorkspaceManager.initialize(params);
    }
    fireInitializedOnDefaultServices(params) {
        const connection = this.services.lsp.Connection;
        const configurationParams = connection ? Object.assign(Object.assign({}, params), { register: params => connection.client.register(DidChangeConfigurationNotification.type, params), fetchConfiguration: params => connection.workspace.getConfiguration(params) }) : params;
        // do not await the promises of the following calls, as they must not block the initialization process!
        //  otherwise, there is the danger of out-of-order processing of subsequent incoming messages from the language client
        // however, awaiting should be possible in general, e.g. in unit test scenarios
        this.services.workspace.ConfigurationProvider.initialized(configurationParams)
            .catch(err => console.error('Error in ConfigurationProvider initialization:', err));
        this.services.workspace.WorkspaceManager.initialized(params)
            .catch(err => console.error('Error in WorkspaceManager initialization:', err));
    }
}
export function startLanguageServer(services) {
    const connection = services.lsp.Connection;
    if (!connection) {
        throw new Error('Starting a language server requires the languageServer.Connection service to be set.');
    }
    addDocumentUpdateHandler(connection, services);
    addFileOperationHandler(connection, services);
    addDiagnosticsHandler(connection, services);
    addCompletionHandler(connection, services);
    addFindReferencesHandler(connection, services);
    addDocumentSymbolHandler(connection, services);
    addGotoDefinitionHandler(connection, services);
    addGoToTypeDefinitionHandler(connection, services);
    addGoToImplementationHandler(connection, services);
    addDocumentHighlightsHandler(connection, services);
    addFoldingRangeHandler(connection, services);
    addFormattingHandler(connection, services);
    addCodeActionHandler(connection, services);
    addRenameHandler(connection, services);
    addHoverHandler(connection, services);
    addInlayHintHandler(connection, services);
    addSemanticTokenHandler(connection, services);
    addExecuteCommandHandler(connection, services);
    addSignatureHelpHandler(connection, services);
    addCallHierarchyHandler(connection, services);
    addTypeHierarchyHandler(connection, services);
    addCodeLensHandler(connection, services);
    addDocumentLinkHandler(connection, services);
    addConfigurationChangeHandler(connection, services);
    addGoToDeclarationHandler(connection, services);
    addWorkspaceSymbolHandler(connection, services);
    connection.onInitialize(params => {
        return services.lsp.LanguageServer.initialize(params);
    });
    connection.onInitialized(params => {
        services.lsp.LanguageServer.initialized(params);
    });
    // Make the text document manager listen on the connection for open, change and close text document events.
    const documents = services.workspace.TextDocuments;
    documents.listen(connection);
    // Start listening for incoming messages from the client.
    connection.listen();
}
/**
 * Adds a handler for document updates when content changes, or watch catches a change.
 * In the case there is no handler service registered, this function does nothing.
 */
export function addDocumentUpdateHandler(connection, services) {
    const handler = services.lsp.DocumentUpdateHandler;
    const documents = services.workspace.TextDocuments;
    if (handler.didOpenDocument) {
        documents.onDidOpen(change => handler.didOpenDocument(change));
    }
    if (handler.didChangeContent) {
        documents.onDidChangeContent(change => handler.didChangeContent(change));
    }
    if (handler.didCloseDocument) {
        documents.onDidClose(change => handler.didCloseDocument(change));
    }
    if (handler.didSaveDocument) {
        documents.onDidSave(change => handler.didSaveDocument(change));
    }
    if (handler.willSaveDocument) {
        documents.onWillSave(event => handler.willSaveDocument(event));
    }
    if (handler.willSaveDocumentWaitUntil) {
        documents.onWillSaveWaitUntil(event => handler.willSaveDocumentWaitUntil(event));
    }
    if (handler.didChangeWatchedFiles) {
        connection.onDidChangeWatchedFiles(params => handler.didChangeWatchedFiles(params));
    }
}
export function addFileOperationHandler(connection, services) {
    const handler = services.lsp.FileOperationHandler;
    if (!handler) {
        return;
    }
    if (handler.didCreateFiles) {
        connection.workspace.onDidCreateFiles(params => handler.didCreateFiles(params));
    }
    if (handler.didRenameFiles) {
        connection.workspace.onDidRenameFiles(params => handler.didRenameFiles(params));
    }
    if (handler.didDeleteFiles) {
        connection.workspace.onDidDeleteFiles(params => handler.didDeleteFiles(params));
    }
    if (handler.willCreateFiles) {
        connection.workspace.onWillCreateFiles(params => handler.willCreateFiles(params));
    }
    if (handler.willRenameFiles) {
        connection.workspace.onWillRenameFiles(params => handler.willRenameFiles(params));
    }
    if (handler.willDeleteFiles) {
        connection.workspace.onWillDeleteFiles(params => handler.willDeleteFiles(params));
    }
}
export function addDiagnosticsHandler(connection, services) {
    const documentBuilder = services.workspace.DocumentBuilder;
    documentBuilder.onUpdate(async (_, deleted) => {
        for (const uri of deleted) {
            connection.sendDiagnostics({
                uri: uri.toString(),
                diagnostics: []
            });
        }
    });
    documentBuilder.onDocumentPhase(DocumentState.Validated, async (document) => {
        if (document.diagnostics) {
            connection.sendDiagnostics({
                uri: document.uri.toString(),
                diagnostics: document.diagnostics
            });
        }
    });
}
export function addCompletionHandler(connection, services) {
    connection.onCompletion(createRequestHandler((services, document, params, cancelToken) => {
        var _a, _b;
        return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CompletionProvider) === null || _b === void 0 ? void 0 : _b.getCompletion(document, params, cancelToken);
    }, services, DocumentState.IndexedReferences));
}
export function addFindReferencesHandler(connection, services) {
    connection.onReferences(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.ReferencesProvider) === null || _b === void 0 ? void 0 : _b.findReferences(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addCodeActionHandler(connection, services) {
    connection.onCodeAction(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CodeActionProvider) === null || _b === void 0 ? void 0 : _b.getCodeActions(document, params, cancelToken); }, services, DocumentState.Validated));
}
export function addDocumentSymbolHandler(connection, services) {
    connection.onDocumentSymbol(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.DocumentSymbolProvider) === null || _b === void 0 ? void 0 : _b.getSymbols(document, params, cancelToken); }, services, DocumentState.Parsed));
}
export function addGotoDefinitionHandler(connection, services) {
    connection.onDefinition(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.DefinitionProvider) === null || _b === void 0 ? void 0 : _b.getDefinition(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addGoToTypeDefinitionHandler(connection, services) {
    connection.onTypeDefinition(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.TypeProvider) === null || _b === void 0 ? void 0 : _b.getTypeDefinition(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addGoToImplementationHandler(connection, services) {
    connection.onImplementation(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.ImplementationProvider) === null || _b === void 0 ? void 0 : _b.getImplementation(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addGoToDeclarationHandler(connection, services) {
    connection.onDeclaration(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.DeclarationProvider) === null || _b === void 0 ? void 0 : _b.getDeclaration(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addDocumentHighlightsHandler(connection, services) {
    connection.onDocumentHighlight(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.DocumentHighlightProvider) === null || _b === void 0 ? void 0 : _b.getDocumentHighlight(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addHoverHandler(connection, services) {
    connection.onHover(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.HoverProvider) === null || _b === void 0 ? void 0 : _b.getHoverContent(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addFoldingRangeHandler(connection, services) {
    connection.onFoldingRanges(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.FoldingRangeProvider) === null || _b === void 0 ? void 0 : _b.getFoldingRanges(document, params, cancelToken); }, services, DocumentState.Parsed));
}
export function addFormattingHandler(connection, services) {
    connection.onDocumentFormatting(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.Formatter) === null || _b === void 0 ? void 0 : _b.formatDocument(document, params, cancelToken); }, services, DocumentState.Parsed));
    connection.onDocumentRangeFormatting(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.Formatter) === null || _b === void 0 ? void 0 : _b.formatDocumentRange(document, params, cancelToken); }, services, DocumentState.Parsed));
    connection.onDocumentOnTypeFormatting(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.Formatter) === null || _b === void 0 ? void 0 : _b.formatDocumentOnType(document, params, cancelToken); }, services, DocumentState.Parsed));
}
export function addRenameHandler(connection, services) {
    connection.onRenameRequest(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.RenameProvider) === null || _b === void 0 ? void 0 : _b.rename(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
    connection.onPrepareRename(createRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.RenameProvider) === null || _b === void 0 ? void 0 : _b.prepareRename(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addInlayHintHandler(connection, services) {
    connection.languages.inlayHint.on(createServerRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.InlayHintProvider) === null || _b === void 0 ? void 0 : _b.getInlayHints(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addSemanticTokenHandler(connection, services) {
    // If no semantic token provider is registered that's fine. Just return an empty result
    const emptyResult = { data: [] };
    connection.languages.semanticTokens.on(createServerRequestHandler((services, document, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.SemanticTokenProvider) {
            return services.lsp.SemanticTokenProvider.semanticHighlight(document, params, cancelToken);
        }
        return emptyResult;
    }, services, DocumentState.IndexedReferences));
    connection.languages.semanticTokens.onDelta(createServerRequestHandler((services, document, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.SemanticTokenProvider) {
            return services.lsp.SemanticTokenProvider.semanticHighlightDelta(document, params, cancelToken);
        }
        return emptyResult;
    }, services, DocumentState.IndexedReferences));
    connection.languages.semanticTokens.onRange(createServerRequestHandler((services, document, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.SemanticTokenProvider) {
            return services.lsp.SemanticTokenProvider.semanticHighlightRange(document, params, cancelToken);
        }
        return emptyResult;
    }, services, DocumentState.IndexedReferences));
}
export function addConfigurationChangeHandler(connection, services) {
    connection.onDidChangeConfiguration(change => {
        if (change.settings) {
            services.workspace.ConfigurationProvider.updateConfiguration(change);
        }
    });
}
export function addExecuteCommandHandler(connection, services) {
    const commandHandler = services.lsp.ExecuteCommandHandler;
    if (commandHandler) {
        connection.onExecuteCommand(async (params, token) => {
            var _a;
            try {
                return await commandHandler.executeCommand(params.command, (_a = params.arguments) !== null && _a !== void 0 ? _a : [], token);
            }
            catch (err) {
                return responseError(err);
            }
        });
    }
}
export function addDocumentLinkHandler(connection, services) {
    connection.onDocumentLinks(createServerRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.DocumentLinkProvider) === null || _b === void 0 ? void 0 : _b.getDocumentLinks(document, params, cancelToken); }, services, DocumentState.Parsed));
}
export function addSignatureHelpHandler(connection, services) {
    connection.onSignatureHelp(createServerRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.SignatureHelp) === null || _b === void 0 ? void 0 : _b.provideSignatureHelp(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addCodeLensHandler(connection, services) {
    connection.onCodeLens(createServerRequestHandler((services, document, params, cancelToken) => { var _a, _b; return (_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CodeLensProvider) === null || _b === void 0 ? void 0 : _b.provideCodeLens(document, params, cancelToken); }, services, DocumentState.IndexedReferences));
}
export function addWorkspaceSymbolHandler(connection, services) {
    var _a;
    const workspaceSymbolProvider = services.lsp.WorkspaceSymbolProvider;
    if (workspaceSymbolProvider) {
        const documentBuilder = services.workspace.DocumentBuilder;
        connection.onWorkspaceSymbol(async (params, token) => {
            try {
                await documentBuilder.waitUntil(DocumentState.IndexedContent, token);
                return await workspaceSymbolProvider.getSymbols(params, token);
            }
            catch (err) {
                return responseError(err);
            }
        });
        const resolveWorkspaceSymbol = (_a = workspaceSymbolProvider.resolveSymbol) === null || _a === void 0 ? void 0 : _a.bind(workspaceSymbolProvider);
        if (resolveWorkspaceSymbol) {
            connection.onWorkspaceSymbolResolve(async (workspaceSymbol, token) => {
                try {
                    await documentBuilder.waitUntil(DocumentState.IndexedContent, token);
                    return await resolveWorkspaceSymbol(workspaceSymbol, token);
                }
                catch (err) {
                    return responseError(err);
                }
            });
        }
    }
}
export function addCallHierarchyHandler(connection, services) {
    connection.languages.callHierarchy.onPrepare(createServerRequestHandler(async (services, document, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CallHierarchyProvider) {
            const result = await services.lsp.CallHierarchyProvider.prepareCallHierarchy(document, params, cancelToken);
            return result !== null && result !== void 0 ? result : null;
        }
        return null;
    }, services, DocumentState.IndexedReferences));
    connection.languages.callHierarchy.onIncomingCalls(createHierarchyRequestHandler(async (services, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CallHierarchyProvider) {
            const result = await services.lsp.CallHierarchyProvider.incomingCalls(params, cancelToken);
            return result !== null && result !== void 0 ? result : null;
        }
        return null;
    }, services));
    connection.languages.callHierarchy.onOutgoingCalls(createHierarchyRequestHandler(async (services, params, cancelToken) => {
        var _a;
        if ((_a = services.lsp) === null || _a === void 0 ? void 0 : _a.CallHierarchyProvider) {
            const result = await services.lsp.CallHierarchyProvider.outgoingCalls(params, cancelToken);
            return result !== null && result !== void 0 ? result : null;
        }
        return null;
    }, services));
}
export function addTypeHierarchyHandler(connection, sharedServices) {
    // Don't register type hierarchy handlers if no type hierarchy provider is registered
    if (!sharedServices.ServiceRegistry.all.some((services) => { var _a; return (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.TypeHierarchyProvider; })) {
        return;
    }
    connection.languages.typeHierarchy.onPrepare(createServerRequestHandler(async (services, document, params, cancelToken) => {
        var _a, _b;
        const result = await ((_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.TypeHierarchyProvider) === null || _b === void 0 ? void 0 : _b.prepareTypeHierarchy(document, params, cancelToken));
        return result !== null && result !== void 0 ? result : null;
    }, sharedServices, DocumentState.IndexedReferences));
    connection.languages.typeHierarchy.onSupertypes(createHierarchyRequestHandler(async (services, params, cancelToken) => {
        var _a, _b;
        const result = await ((_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.TypeHierarchyProvider) === null || _b === void 0 ? void 0 : _b.supertypes(params, cancelToken));
        return result !== null && result !== void 0 ? result : null;
    }, sharedServices));
    connection.languages.typeHierarchy.onSubtypes(createHierarchyRequestHandler(async (services, params, cancelToken) => {
        var _a, _b;
        const result = await ((_b = (_a = services.lsp) === null || _a === void 0 ? void 0 : _a.TypeHierarchyProvider) === null || _b === void 0 ? void 0 : _b.subtypes(params, cancelToken));
        return result !== null && result !== void 0 ? result : null;
    }, sharedServices));
}
export function createHierarchyRequestHandler(serviceCall, sharedServices) {
    const serviceRegistry = sharedServices.ServiceRegistry;
    return async (params, cancelToken) => {
        const uri = URI.parse(params.item.uri);
        const cancellationError = await waitUntilPhase(sharedServices, cancelToken, uri, DocumentState.IndexedReferences);
        if (cancellationError) {
            return cancellationError;
        }
        if (!serviceRegistry.hasServices(uri)) {
            const errorText = `Could not find service instance for uri: '${uri}'`;
            console.debug(errorText);
            return responseError(new Error(errorText));
        }
        const language = serviceRegistry.getServices(uri);
        try {
            return await serviceCall(language, params, cancelToken);
        }
        catch (err) {
            return responseError(err);
        }
    };
}
export function createServerRequestHandler(serviceCall, sharedServices, targetState) {
    const documents = sharedServices.workspace.LangiumDocuments;
    const serviceRegistry = sharedServices.ServiceRegistry;
    return async (params, cancelToken) => {
        const uri = URI.parse(params.textDocument.uri);
        const cancellationError = await waitUntilPhase(sharedServices, cancelToken, uri, targetState);
        if (cancellationError) {
            return cancellationError;
        }
        if (!serviceRegistry.hasServices(uri)) {
            const errorText = `Could not find service instance for uri: '${uri}'`;
            console.debug(errorText);
            return responseError(new Error(errorText));
        }
        const language = serviceRegistry.getServices(uri);
        try {
            const document = await documents.getOrCreateDocument(uri);
            return await serviceCall(language, document, params, cancelToken);
        }
        catch (err) {
            return responseError(err);
        }
    };
}
export function createRequestHandler(serviceCall, sharedServices, targetState) {
    const documents = sharedServices.workspace.LangiumDocuments;
    const serviceRegistry = sharedServices.ServiceRegistry;
    return async (params, cancelToken) => {
        const uri = URI.parse(params.textDocument.uri);
        const cancellationError = await waitUntilPhase(sharedServices, cancelToken, uri, targetState);
        if (cancellationError) {
            return cancellationError;
        }
        if (!serviceRegistry.hasServices(uri)) {
            console.debug(`Could not find service instance for uri: '${uri.toString()}'`);
            return null;
        }
        const language = serviceRegistry.getServices(uri);
        try {
            const document = await documents.getOrCreateDocument(uri);
            return await serviceCall(language, document, params, cancelToken);
        }
        catch (err) {
            return responseError(err);
        }
    };
}
async function waitUntilPhase(services, cancelToken, uri, targetState) {
    if (targetState !== undefined) {
        const documentBuilder = services.workspace.DocumentBuilder;
        try {
            await documentBuilder.waitUntil(targetState, uri, cancelToken);
        }
        catch (err) {
            return responseError(err);
        }
    }
    return undefined;
}
function responseError(err) {
    if (isOperationCancelled(err)) {
        return new ResponseError(LSPErrorCodes.RequestCancelled, 'The request has been cancelled.');
    }
    if (err instanceof ResponseError) {
        return err;
    }
    throw err;
}
//# sourceMappingURL=language-server.js.map