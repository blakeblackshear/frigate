/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices, LangiumSharedCoreServices } from './services.js';
import type { TextDocumentProvider } from './workspace/documents.js';
import { UriUtils, type URI } from './utils/uri-utils.js';

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
export class DefaultServiceRegistry implements ServiceRegistry {

    protected singleton?: LangiumCoreServices;
    protected readonly languageIdMap = new Map<string, LangiumCoreServices>();
    protected readonly fileExtensionMap = new Map<string, LangiumCoreServices>();

    /**
     * @deprecated Use the new `fileExtensionMap` (or `languageIdMap`) property instead.
     */
    protected get map(): Map<string, LangiumCoreServices> | undefined {
        return this.fileExtensionMap;
    }

    protected readonly textDocuments?: TextDocumentProvider;

    constructor(services?: LangiumSharedCoreServices) {
        this.textDocuments = services?.workspace.TextDocuments;
    }

    register(language: LangiumCoreServices): void {
        const data = language.LanguageMetaData;
        for (const ext of data.fileExtensions) {
            if (this.fileExtensionMap.has(ext)) {
                console.warn(`The file extension ${ext} is used by multiple languages. It is now assigned to '${data.languageId}'.`);
            }
            this.fileExtensionMap.set(ext, language);
        }
        this.languageIdMap.set(data.languageId, language);
        if (this.languageIdMap.size === 1) {
            this.singleton = language;
        } else {
            this.singleton = undefined;
        }
    }

    getServices(uri: URI): LangiumCoreServices {
        if (this.singleton !== undefined) {
            return this.singleton;
        }
        if (this.languageIdMap.size === 0) {
            throw new Error('The service registry is empty. Use `register` to register the services of a language.');
        }
        const languageId = this.textDocuments?.get(uri)?.languageId;
        if (languageId !== undefined) {
            const services = this.languageIdMap.get(languageId);
            if (services) {
                return services;
            }
        }
        const ext = UriUtils.extname(uri);
        const services = this.fileExtensionMap.get(ext);
        if (!services) {
            if (languageId) {
                throw new Error(`The service registry contains no services for the extension '${ext}' for language '${languageId}'.`);
            } else {
                throw new Error(`The service registry contains no services for the extension '${ext}'.`);
            }
        }
        return services;
    }

    hasServices(uri: URI): boolean {
        try {
            this.getServices(uri);
            return true;
        } catch {
            return false;
        }
    }

    get all(): readonly LangiumCoreServices[] {
        return Array.from(this.languageIdMap.values());
    }
}
