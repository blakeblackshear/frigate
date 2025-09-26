/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
******************************************************************************/
import type { Connection } from 'vscode-languageserver';
import { type DefaultCoreModuleContext, type DefaultSharedCoreModuleContext } from '../default-module.js';
import { Module } from '../dependency-injection.js';
import type { LangiumDefaultCoreServices, LangiumDefaultSharedCoreServices } from '../services.js';
import type { LangiumLSPServices, LangiumServices, LangiumSharedLSPServices, LangiumSharedServices } from './lsp-services.js';
/**
 * Context required for creating the default language-specific dependency injection module.
 */
export interface DefaultModuleContext extends DefaultCoreModuleContext {
    readonly shared: LangiumSharedServices;
}
/**
 * Creates a dependency injection module configuring the default Core & LSP services for a Langium-based language implementation.
 * This is a set of services that are dedicated to a specific language.
 */
export declare function createDefaultModule(context: DefaultModuleContext): Module<LangiumServices, LangiumDefaultCoreServices & LangiumLSPServices>;
/**
 * Creates a dependency injection module configuring the default LSP services.
 * This is a set of services that are dedicated to a specific language.
 */
export declare function createDefaultLSPModule(context: DefaultModuleContext): Module<LangiumServices, LangiumLSPServices>;
export interface DefaultSharedModuleContext extends DefaultSharedCoreModuleContext {
    /**
     * Represents an abstract language server connection
     */
    readonly connection?: Connection;
}
/**
 * Creates a dependency injection module configuring the default core & LSP services shared among languages supported by a Langium-based language server.
 * This is the set of services that are shared between multiple languages.
 */
export declare function createDefaultSharedModule(context: DefaultSharedModuleContext): Module<LangiumSharedServices, LangiumDefaultSharedCoreServices & LangiumSharedLSPServices>;
/**
 * Creates a dependency injection module configuring the default shared LSP services.
 * This is the set of services that are shared between multiple languages.
 */
export declare function createDefaultSharedLSPModule(context: DefaultSharedModuleContext): Module<LangiumSharedServices, LangiumSharedLSPServices>;
//# sourceMappingURL=default-lsp-module.d.ts.map