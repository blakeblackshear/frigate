/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Connection } from 'vscode-languageserver';
import type { DeepPartial, LangiumCoreServices, LangiumSharedCoreServices } from '../services.js';
import type { TextDocument } from '../workspace/documents.js';
import type { CallHierarchyProvider } from './call-hierarchy-provider.js';
import type { CodeActionProvider } from './code-action.js';
import type { CodeLensProvider } from './code-lens-provider.js';
import type { CompletionProvider } from './completion/completion-provider.js';
import type { DeclarationProvider } from './declaration-provider.js';
import type { DefinitionProvider } from './definition-provider.js';
import type { DocumentHighlightProvider } from './document-highlight-provider.js';
import type { DocumentLinkProvider } from './document-link-provider.js';
import type { DocumentSymbolProvider } from './document-symbol-provider.js';
import type { DocumentUpdateHandler } from './document-update-handler.js';
import type { ExecuteCommandHandler } from './execute-command-handler.js';
import type { FileOperationHandler } from './file-operation-handler.js';
import type { FoldingRangeProvider } from './folding-range-provider.js';
import type { Formatter } from './formatter.js';
import type { FuzzyMatcher } from './fuzzy-matcher.js';
import type { HoverProvider } from './hover-provider.js';
import type { ImplementationProvider } from './implementation-provider.js';
import type { InlayHintProvider } from './inlay-hint-provider.js';
import type { LanguageServer } from './language-server.js';
import type { NodeKindProvider } from './node-kind-provider.js';
import type { ReferencesProvider } from './references-provider.js';
import type { RenameProvider } from './rename-provider.js';
import type { SemanticTokenProvider } from './semantic-token-provider.js';
import type { SignatureHelpProvider } from './signature-help-provider.js';
import type { TypeHierarchyProvider } from './type-hierarchy-provider.js';
import type { TypeDefinitionProvider } from './type-provider.js';
import type { WorkspaceSymbolProvider } from './workspace-symbol-provider.js';
import type { TextDocuments } from './normalized-text-documents.js';

/**
 * Combined Core + LSP services of Langium (total services)
 */
export type LangiumServices = LangiumCoreServices & LangiumLSPServices;

/**
 * Combined Core + LSP shared services of Langium (total services)
 */
export type LangiumSharedServices = LangiumSharedCoreServices & LangiumSharedLSPServices;

/**
 * LSP services for a specific language of which Langium provides default implementations.
 */
export type LangiumLSPServices = {
    readonly lsp: {
        readonly CompletionProvider?: CompletionProvider
        readonly DocumentHighlightProvider?: DocumentHighlightProvider
        readonly DocumentSymbolProvider?: DocumentSymbolProvider
        readonly HoverProvider?: HoverProvider
        readonly FoldingRangeProvider?: FoldingRangeProvider
        readonly DefinitionProvider?: DefinitionProvider
        readonly TypeProvider?: TypeDefinitionProvider
        readonly ImplementationProvider?: ImplementationProvider
        readonly ReferencesProvider?: ReferencesProvider
        readonly CodeActionProvider?: CodeActionProvider
        readonly SemanticTokenProvider?: SemanticTokenProvider
        readonly RenameProvider?: RenameProvider
        readonly Formatter?: Formatter
        readonly SignatureHelp?: SignatureHelpProvider
        readonly CallHierarchyProvider?: CallHierarchyProvider
        readonly TypeHierarchyProvider?: TypeHierarchyProvider
        readonly DeclarationProvider?: DeclarationProvider
        readonly InlayHintProvider?: InlayHintProvider
        readonly CodeLensProvider?: CodeLensProvider
        readonly DocumentLinkProvider?: DocumentLinkProvider
    },
    readonly shared: LangiumSharedServices
};

/**
 * LSP services shared between multiple languages of which Langium provides default implementations.
 */
export type LangiumSharedLSPServices = {
    readonly lsp: {
        readonly Connection?: Connection
        readonly DocumentUpdateHandler: DocumentUpdateHandler
        readonly ExecuteCommandHandler?: ExecuteCommandHandler
        readonly FileOperationHandler?: FileOperationHandler
        readonly FuzzyMatcher: FuzzyMatcher
        readonly LanguageServer: LanguageServer
        readonly NodeKindProvider: NodeKindProvider
        readonly WorkspaceSymbolProvider?: WorkspaceSymbolProvider
    },
    readonly workspace: {
        readonly TextDocuments: TextDocuments<TextDocument>
    }
};

/**
 * Language-specific LSP services to be partially overridden via dependency injection.
 */
export type PartialLangiumLSPServices = DeepPartial<LangiumLSPServices>

/**
 * Language-specific services to be partially overridden via dependency injection.
 */
export type PartialLangiumServices = DeepPartial<LangiumServices>

/**
 * Shared LSP services to be partially overridden via dependency injection.
 */
export type PartialLangiumSharedLSPServices = DeepPartial<LangiumSharedLSPServices>

/**
 * Shared services to be partially overridden via dependency injection.
 */
export type PartialLangiumSharedServices = DeepPartial<LangiumSharedServices>
