/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices, LangiumSharedCoreServices } from './services.js';
import type { TextDocumentProvider } from './workspace/documents.js';
import { type URI } from './utils/uri-utils.js';
/**
 * The service registry provides access to the language-specific {@link LangiumCoreServices} optionally including LSP-related services.
 * These are resolved via the URI of a text document.
 */
export interface ServiceRegistry {
    /**
     * Register a language via its injected services.
     */
    register(language: LangiumCoreServices): void;
    /**
     * Retrieve the language-specific services for the given URI. In case only one language is
     * registered, it may be used regardless of the URI format.
     */
    getServices(uri: URI): LangiumCoreServices;
    /**
     * Check whether services are available for the given URI.
     */
    hasServices(uri: URI): boolean;
    /**
     * The full set of registered language services.
     */
    readonly all: readonly LangiumCoreServices[];
}
/**
 * Generic registry for Langium services, but capable of being used with extending service sets as well (such as the lsp-complete LangiumCoreServices set)
 */
export declare class DefaultServiceRegistry implements ServiceRegistry {
    protected singleton?: LangiumCoreServices;
    protected readonly languageIdMap: Map<string, LangiumCoreServices>;
    protected readonly fileExtensionMap: Map<string, LangiumCoreServices>;
    /**
     * @deprecated Use the new `fileExtensionMap` (or `languageIdMap`) property instead.
     */
    protected get map(): Map<string, LangiumCoreServices> | undefined;
    protected readonly textDocuments?: TextDocumentProvider;
    constructor(services?: LangiumSharedCoreServices);
    register(language: LangiumCoreServices): void;
    getServices(uri: URI): LangiumCoreServices;
    hasServices(uri: URI): boolean;
    get all(): readonly LangiumCoreServices[];
}
//# sourceMappingURL=service-registry.d.ts.map