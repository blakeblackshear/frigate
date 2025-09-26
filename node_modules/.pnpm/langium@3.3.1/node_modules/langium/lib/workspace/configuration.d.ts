/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Emitter } from '../utils/event.js';
import type { ConfigurationItem, DidChangeConfigurationParams, DidChangeConfigurationRegistrationOptions, Disposable, Event, InitializeParams, InitializedParams } from 'vscode-languageserver-protocol';
import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import { Deferred } from '../utils/promise-utils.js';
export interface ConfigurationProvider {
    /**
     * A promise that resolves when the configuration provider is ready to be used.
     */
    readonly ready: Promise<void>;
    /**
     * When used in a language server context, this method is called when the server receives
     * the `initialize` request.
     */
    initialize(params: InitializeParams): void;
    /**
     * When used in a language server context, this method is called when the server receives
     * the `initialized` notification.
     */
    initialized(params: ConfigurationInitializedParams): Promise<void>;
    /**
     * Returns a configuration value stored for the given language.
     *
     * @param language The language id
     * @param configuration Configuration name
     */
    getConfiguration(language: string, configuration: string): Promise<any>;
    /**
     *  Updates the cached configurations using the `change` notification parameters.
     *
     * @param change The parameters of a change configuration notification.
     * `settings` property of the change object could be expressed as `Record<string, Record<string, any>>`
     */
    updateConfiguration(change: DidChangeConfigurationParams): void;
    /**
     * Get notified after a configuration section has been updated.
     */
    onConfigurationSectionUpdate(callback: ConfigurationSectionUpdateListener): Disposable;
}
export interface ConfigurationInitializedParams extends InitializedParams {
    register?: (params: DidChangeConfigurationRegistrationOptions) => void;
    fetchConfiguration?: (configuration: ConfigurationItem[]) => Promise<any>;
}
export interface ConfigurationSectionUpdate {
    /**
     * The name of the configuration section that has been updated.
     */
    section: string;
    /**
     * The updated configuration section.
     */
    configuration: any;
}
export type ConfigurationSectionUpdateListener = (update: ConfigurationSectionUpdate) => void;
/**
 * Base configuration provider for building up other configuration providers
 */
export declare class DefaultConfigurationProvider implements ConfigurationProvider {
    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly _ready: Deferred<void>;
    protected settings: Record<string, Record<string, any>>;
    protected workspaceConfig: boolean;
    protected onConfigurationSectionUpdateEmitter: Emitter<ConfigurationSectionUpdate>;
    constructor(services: LangiumSharedCoreServices);
    get ready(): Promise<void>;
    initialize(params: InitializeParams): void;
    initialized(params: ConfigurationInitializedParams): Promise<void>;
    /**
     *  Updates the cached configurations using the `change` notification parameters.
     *
     * @param change The parameters of a change configuration notification.
     * `settings` property of the change object could be expressed as `Record<string, Record<string, any>>`
     */
    updateConfiguration(change: DidChangeConfigurationParams): void;
    protected updateSectionConfiguration(section: string, configuration: any): void;
    /**
    * Returns a configuration value stored for the given language.
    *
    * @param language The language id
    * @param configuration Configuration name
    */
    getConfiguration(language: string, configuration: string): Promise<any>;
    protected toSectionName(languageId: string): string;
    get onConfigurationSectionUpdate(): Event<ConfigurationSectionUpdate>;
}
//# sourceMappingURL=configuration.d.ts.map