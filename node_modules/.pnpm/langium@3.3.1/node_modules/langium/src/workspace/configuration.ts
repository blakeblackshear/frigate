/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { Emitter } from '../utils/event.js';
import type {
    ConfigurationItem,
    DidChangeConfigurationParams,
    DidChangeConfigurationRegistrationOptions,
    Disposable,
    Event,
    InitializeParams,
    InitializedParams
} from 'vscode-languageserver-protocol';
import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import { Deferred } from '../utils/promise-utils.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    onConfigurationSectionUpdate(callback: ConfigurationSectionUpdateListener): Disposable
}

export interface ConfigurationInitializedParams extends InitializedParams {
    register?: (params: DidChangeConfigurationRegistrationOptions) => void,
    fetchConfiguration?: (configuration: ConfigurationItem[]) => Promise<any>
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
export class DefaultConfigurationProvider implements ConfigurationProvider {

    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly _ready = new Deferred<void>();
    protected settings: Record<string, Record<string, any>> = {};
    protected workspaceConfig = false;
    protected onConfigurationSectionUpdateEmitter = new Emitter<ConfigurationSectionUpdate>();

    constructor(services: LangiumSharedCoreServices) {
        this.serviceRegistry = services.ServiceRegistry;
    }

    get ready(): Promise<void> {
        return this._ready.promise;
    }

    initialize(params: InitializeParams): void {
        this.workspaceConfig = params.capabilities.workspace?.configuration ?? false;
    }

    async initialized(params: ConfigurationInitializedParams): Promise<void> {
        if (this.workspaceConfig) {
            if (params.register) {
                // params.register(...) is a function to be provided by the calling language server for the sake of
                //  decoupling this implementation from the concrete LSP implementations, specifically the LSP Connection

                const languages = this.serviceRegistry.all;
                params.register({
                    // Listen to configuration changes for all languages
                    section: languages.map(lang => this.toSectionName(lang.LanguageMetaData.languageId))
                });
            }

            if (params.fetchConfiguration) {
                // params.fetchConfiguration(...) is a function to be provided by the calling language server for the sake of
                //  decoupling this implementation from the concrete LSP implementations, specifically the LSP Connection
                const configToUpdate = this.serviceRegistry.all.map(lang => <ConfigurationItem>{
                    // Fetch the configuration changes for all languages
                    section: this.toSectionName(lang.LanguageMetaData.languageId)
                });

                // get workspace configurations (default scope URI)
                const configs = await params.fetchConfiguration(configToUpdate);
                configToUpdate.forEach((conf, idx) => {
                    this.updateSectionConfiguration(conf.section!, configs[idx]);
                });
            }
        }
        this._ready.resolve();
    }

    /**
     *  Updates the cached configurations using the `change` notification parameters.
     *
     * @param change The parameters of a change configuration notification.
     * `settings` property of the change object could be expressed as `Record<string, Record<string, any>>`
     */
    updateConfiguration(change: DidChangeConfigurationParams): void {
        if (!change.settings) {
            return;
        }
        Object.keys(change.settings).forEach(section => {
            const configuration = change.settings[section];
            this.updateSectionConfiguration(section, configuration);
            this.onConfigurationSectionUpdateEmitter.fire({ section, configuration });
        });
    }

    protected updateSectionConfiguration(section: string, configuration: any): void {
        this.settings[section] = configuration;
    }

    /**
    * Returns a configuration value stored for the given language.
    *
    * @param language The language id
    * @param configuration Configuration name
    */
    async getConfiguration(language: string, configuration: string): Promise<any> {
        await this.ready;

        const sectionName = this.toSectionName(language);
        if (this.settings[sectionName]) {
            return this.settings[sectionName][configuration];
        }
    }

    protected toSectionName(languageId: string): string {
        return `${languageId}`;
    }

    get onConfigurationSectionUpdate(): Event<ConfigurationSectionUpdate> {
        return this.onConfigurationSectionUpdateEmitter.event;
    }
}
