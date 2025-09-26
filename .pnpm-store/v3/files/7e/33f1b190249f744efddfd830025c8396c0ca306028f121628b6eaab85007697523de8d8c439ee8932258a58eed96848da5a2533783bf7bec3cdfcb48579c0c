/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
******************************************************************************/
import type { Module } from './dependency-injection.js';
import type { LangiumDefaultCoreServices, LangiumDefaultSharedCoreServices, LangiumCoreServices, LangiumSharedCoreServices } from './services.js';
import type { FileSystemProvider } from './workspace/file-system-provider.js';
/**
 * Context required for creating the default language-specific dependency injection module.
 */
export interface DefaultCoreModuleContext {
    shared: LangiumSharedCoreServices;
}
/**
 * Creates a dependency injection module configuring the default core services.
 * This is a set of services that are dedicated to a specific language.
 */
export declare function createDefaultCoreModule(context: DefaultCoreModuleContext): Module<LangiumCoreServices, LangiumDefaultCoreServices>;
/**
 * Context required for creating the default shared dependency injection module.
 */
export interface DefaultSharedCoreModuleContext {
    /**
     * Factory function to create a {@link FileSystemProvider}.
     *
     * Langium exposes an `EmptyFileSystem` and `NodeFileSystem`, exported through `langium/node`.
     * When running Langium as part of a vscode language server or a Node.js app, using the `NodeFileSystem` is recommended,
     * the `EmptyFileSystem` in every other use case.
     */
    fileSystemProvider: (services: LangiumSharedCoreServices) => FileSystemProvider;
}
/**
 * Creates a dependency injection module configuring the default shared core services.
 * This is the set of services that are shared between multiple languages.
 */
export declare function createDefaultSharedCoreModule(context: DefaultSharedCoreModuleContext): Module<LangiumSharedCoreServices, LangiumDefaultSharedCoreServices>;
//# sourceMappingURL=default-module.d.ts.map