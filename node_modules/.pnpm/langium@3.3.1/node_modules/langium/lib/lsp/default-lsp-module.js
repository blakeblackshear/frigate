/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
******************************************************************************/
import { createDefaultCoreModule, createDefaultSharedCoreModule } from '../default-module.js';
import { Module } from '../dependency-injection.js';
import { TextDocument } from '../workspace/documents.js';
import { DefaultCompletionProvider } from './completion/completion-provider.js';
import { DefaultDefinitionProvider } from './definition-provider.js';
import { DefaultDocumentHighlightProvider } from './document-highlight-provider.js';
import { DefaultDocumentSymbolProvider } from './document-symbol-provider.js';
import { DefaultDocumentUpdateHandler } from './document-update-handler.js';
import { DefaultFoldingRangeProvider } from './folding-range-provider.js';
import { DefaultFuzzyMatcher } from './fuzzy-matcher.js';
import { MultilineCommentHoverProvider } from './hover-provider.js';
import { DefaultLanguageServer } from './language-server.js';
import { DefaultNodeKindProvider } from './node-kind-provider.js';
import { DefaultReferencesProvider } from './references-provider.js';
import { DefaultRenameProvider } from './rename-provider.js';
import { DefaultWorkspaceSymbolProvider } from './workspace-symbol-provider.js';
import { NormalizedTextDocuments } from './normalized-text-documents.js';
/**
 * Creates a dependency injection module configuring the default Core & LSP services for a Langium-based language implementation.
 * This is a set of services that are dedicated to a specific language.
 */
export function createDefaultModule(context) {
    return Module.merge(createDefaultCoreModule(context), createDefaultLSPModule(context));
}
/**
 * Creates a dependency injection module configuring the default LSP services.
 * This is a set of services that are dedicated to a specific language.
 */
export function createDefaultLSPModule(context) {
    return {
        lsp: {
            CompletionProvider: (services) => new DefaultCompletionProvider(services),
            DocumentSymbolProvider: (services) => new DefaultDocumentSymbolProvider(services),
            HoverProvider: (services) => new MultilineCommentHoverProvider(services),
            FoldingRangeProvider: (services) => new DefaultFoldingRangeProvider(services),
            ReferencesProvider: (services) => new DefaultReferencesProvider(services),
            DefinitionProvider: (services) => new DefaultDefinitionProvider(services),
            DocumentHighlightProvider: (services) => new DefaultDocumentHighlightProvider(services),
            RenameProvider: (services) => new DefaultRenameProvider(services)
        },
        shared: () => context.shared
    };
}
/**
 * Creates a dependency injection module configuring the default core & LSP services shared among languages supported by a Langium-based language server.
 * This is the set of services that are shared between multiple languages.
 */
export function createDefaultSharedModule(context) {
    return Module.merge(createDefaultSharedCoreModule(context), createDefaultSharedLSPModule(context));
}
/**
 * Creates a dependency injection module configuring the default shared LSP services.
 * This is the set of services that are shared between multiple languages.
 */
export function createDefaultSharedLSPModule(context) {
    return {
        lsp: {
            Connection: () => context.connection,
            LanguageServer: (services) => new DefaultLanguageServer(services),
            DocumentUpdateHandler: (services) => new DefaultDocumentUpdateHandler(services),
            WorkspaceSymbolProvider: (services) => new DefaultWorkspaceSymbolProvider(services),
            NodeKindProvider: () => new DefaultNodeKindProvider(),
            FuzzyMatcher: () => new DefaultFuzzyMatcher(),
        },
        workspace: {
            TextDocuments: () => new NormalizedTextDocuments(TextDocument)
        }
    };
}
//# sourceMappingURL=default-lsp-module.js.map