/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
******************************************************************************/
import { createGrammarConfig } from './languages/grammar-config.js';
import { createCompletionParser } from './parser/completion-parser-builder.js';
import { createLangiumParser } from './parser/langium-parser-builder.js';
import { DefaultTokenBuilder } from './parser/token-builder.js';
import { DefaultValueConverter } from './parser/value-converter.js';
import { DefaultLinker } from './references/linker.js';
import { DefaultNameProvider } from './references/name-provider.js';
import { DefaultReferences } from './references/references.js';
import { DefaultScopeComputation } from './references/scope-computation.js';
import { DefaultScopeProvider } from './references/scope-provider.js';
import { DefaultJsonSerializer } from './serializer/json-serializer.js';
import { DefaultServiceRegistry } from './service-registry.js';
import { DefaultDocumentValidator } from './validation/document-validator.js';
import { ValidationRegistry } from './validation/validation-registry.js';
import { DefaultAstNodeDescriptionProvider, DefaultReferenceDescriptionProvider } from './workspace/ast-descriptions.js';
import { DefaultAstNodeLocator } from './workspace/ast-node-locator.js';
import { DefaultConfigurationProvider } from './workspace/configuration.js';
import { DefaultDocumentBuilder } from './workspace/document-builder.js';
import { DefaultLangiumDocumentFactory, DefaultLangiumDocuments } from './workspace/documents.js';
import { DefaultIndexManager } from './workspace/index-manager.js';
import { DefaultWorkspaceManager } from './workspace/workspace-manager.js';
import { DefaultLexer, DefaultLexerErrorMessageProvider } from './parser/lexer.js';
import { JSDocDocumentationProvider } from './documentation/documentation-provider.js';
import { DefaultCommentProvider } from './documentation/comment-provider.js';
import { LangiumParserErrorMessageProvider } from './parser/langium-parser.js';
import { DefaultAsyncParser } from './parser/async-parser.js';
import { DefaultWorkspaceLock } from './workspace/workspace-lock.js';
import { DefaultHydrator } from './serializer/hydrator.js';
/**
 * Creates a dependency injection module configuring the default core services.
 * This is a set of services that are dedicated to a specific language.
 */
export function createDefaultCoreModule(context) {
    return {
        documentation: {
            CommentProvider: (services) => new DefaultCommentProvider(services),
            DocumentationProvider: (services) => new JSDocDocumentationProvider(services)
        },
        parser: {
            AsyncParser: (services) => new DefaultAsyncParser(services),
            GrammarConfig: (services) => createGrammarConfig(services),
            LangiumParser: (services) => createLangiumParser(services),
            CompletionParser: (services) => createCompletionParser(services),
            ValueConverter: () => new DefaultValueConverter(),
            TokenBuilder: () => new DefaultTokenBuilder(),
            Lexer: (services) => new DefaultLexer(services),
            ParserErrorMessageProvider: () => new LangiumParserErrorMessageProvider(),
            LexerErrorMessageProvider: () => new DefaultLexerErrorMessageProvider()
        },
        workspace: {
            AstNodeLocator: () => new DefaultAstNodeLocator(),
            AstNodeDescriptionProvider: (services) => new DefaultAstNodeDescriptionProvider(services),
            ReferenceDescriptionProvider: (services) => new DefaultReferenceDescriptionProvider(services)
        },
        references: {
            Linker: (services) => new DefaultLinker(services),
            NameProvider: () => new DefaultNameProvider(),
            ScopeProvider: (services) => new DefaultScopeProvider(services),
            ScopeComputation: (services) => new DefaultScopeComputation(services),
            References: (services) => new DefaultReferences(services)
        },
        serializer: {
            Hydrator: (services) => new DefaultHydrator(services),
            JsonSerializer: (services) => new DefaultJsonSerializer(services)
        },
        validation: {
            DocumentValidator: (services) => new DefaultDocumentValidator(services),
            ValidationRegistry: (services) => new ValidationRegistry(services)
        },
        shared: () => context.shared
    };
}
/**
 * Creates a dependency injection module configuring the default shared core services.
 * This is the set of services that are shared between multiple languages.
 */
export function createDefaultSharedCoreModule(context) {
    return {
        ServiceRegistry: (services) => new DefaultServiceRegistry(services),
        workspace: {
            LangiumDocuments: (services) => new DefaultLangiumDocuments(services),
            LangiumDocumentFactory: (services) => new DefaultLangiumDocumentFactory(services),
            DocumentBuilder: (services) => new DefaultDocumentBuilder(services),
            IndexManager: (services) => new DefaultIndexManager(services),
            WorkspaceManager: (services) => new DefaultWorkspaceManager(services),
            FileSystemProvider: (services) => context.fileSystemProvider(services),
            WorkspaceLock: () => new DefaultWorkspaceLock(),
            ConfigurationProvider: (services) => new DefaultConfigurationProvider(services)
        }
    };
}
//# sourceMappingURL=default-module.js.map