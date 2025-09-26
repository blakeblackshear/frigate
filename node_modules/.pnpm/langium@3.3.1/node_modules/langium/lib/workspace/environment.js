/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class DefaultEnvironment {
    constructor() {
        this._isLanguageServer = false;
        this._locale = 'en';
    }
    get isLanguageServer() {
        return this._isLanguageServer;
    }
    get locale() {
        return this._locale;
    }
    initialize(params) {
        this.update({
            isLanguageServer: true,
            locale: params.locale
        });
    }
    initialized(_params) {
    }
    update(newEnvironment) {
        if (typeof newEnvironment.isLanguageServer === 'boolean') {
            this._isLanguageServer = newEnvironment.isLanguageServer;
        }
        if (typeof newEnvironment.locale === 'string') {
            this._locale = newEnvironment.locale;
        }
    }
}
//# sourceMappingURL=environment.js.map