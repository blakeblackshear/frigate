/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Emitter } from '../utils/event.js';
import { Deferred } from '../utils/promise-utils.js';
/**
 * Base configuration provider for building up other configuration providers
 */
export class DefaultConfigurationProvider {
    constructor(services) {
        this._ready = new Deferred();
        this.settings = {};
        this.workspaceConfig = false;
        this.onConfigurationSectionUpdateEmitter = new Emitter();
        this.serviceRegistry = services.ServiceRegistry;
    }
    get ready() {
        return this._ready.promise;
    }
    initialize(params) {
        var _a, _b;
        this.workspaceConfig = (_b = (_a = params.capabilities.workspace) === null || _a === void 0 ? void 0 : _a.configuration) !== null && _b !== void 0 ? _b : false;
    }
    async initialized(params) {
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
                const configToUpdate = this.serviceRegistry.all.map(lang => ({
                    // Fetch the configuration changes for all languages
                    section: this.toSectionName(lang.LanguageMetaData.languageId)
                }));
                // get workspace configurations (default scope URI)
                const configs = await params.fetchConfiguration(configToUpdate);
                configToUpdate.forEach((conf, idx) => {
                    this.updateSectionConfiguration(conf.section, configs[idx]);
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
    updateConfiguration(change) {
        if (!change.settings) {
            return;
        }
        Object.keys(change.settings).forEach(section => {
            const configuration = change.settings[section];
            this.updateSectionConfiguration(section, configuration);
            this.onConfigurationSectionUpdateEmitter.fire({ section, configuration });
        });
    }
    updateSectionConfiguration(section, configuration) {
        this.settings[section] = configuration;
    }
    /**
    * Returns a configuration value stored for the given language.
    *
    * @param language The language id
    * @param configuration Configuration name
    */
    async getConfiguration(language, configuration) {
        await this.ready;
        const sectionName = this.toSectionName(language);
        if (this.settings[sectionName]) {
            return this.settings[sectionName][configuration];
        }
    }
    toSectionName(languageId) {
        return `${languageId}`;
    }
    get onConfigurationSectionUpdate() {
        return this.onConfigurationSectionUpdateEmitter.event;
    }
}
//# sourceMappingURL=configuration.js.map