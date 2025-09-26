/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { UriUtils } from './utils/uri-utils.js';
/**
 * Generic registry for Langium services, but capable of being used with extending service sets as well (such as the lsp-complete LangiumCoreServices set)
 */
export class DefaultServiceRegistry {
    /**
     * @deprecated Use the new `fileExtensionMap` (or `languageIdMap`) property instead.
     */
    get map() {
        return this.fileExtensionMap;
    }
    constructor(services) {
        this.languageIdMap = new Map();
        this.fileExtensionMap = new Map();
        this.textDocuments = services === null || services === void 0 ? void 0 : services.workspace.TextDocuments;
    }
    register(language) {
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
        }
        else {
            this.singleton = undefined;
        }
    }
    getServices(uri) {
        var _a, _b;
        if (this.singleton !== undefined) {
            return this.singleton;
        }
        if (this.languageIdMap.size === 0) {
            throw new Error('The service registry is empty. Use `register` to register the services of a language.');
        }
        const languageId = (_b = (_a = this.textDocuments) === null || _a === void 0 ? void 0 : _a.get(uri)) === null || _b === void 0 ? void 0 : _b.languageId;
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
            }
            else {
                throw new Error(`The service registry contains no services for the extension '${ext}'.`);
            }
        }
        return services;
    }
    hasServices(uri) {
        try {
            this.getServices(uri);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    get all() {
        return Array.from(this.languageIdMap.values());
    }
}
//# sourceMappingURL=service-registry.js.map