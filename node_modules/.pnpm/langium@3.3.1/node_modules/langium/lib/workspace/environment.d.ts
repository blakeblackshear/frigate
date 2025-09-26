/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { InitializeParams, InitializedParams } from 'vscode-languageserver-protocol';
export interface EnvironmentInfo {
    readonly isLanguageServer: boolean;
    readonly locale: string;
}
export interface Environment extends EnvironmentInfo {
    initialize(params: InitializeParams): void;
    initialized(params: InitializedParams): void;
    update(newEnvironment: Partial<EnvironmentInfo>): void;
}
export declare class DefaultEnvironment implements Environment {
    private _isLanguageServer;
    private _locale;
    get isLanguageServer(): boolean;
    get locale(): string;
    initialize(params: InitializeParams): void;
    initialized(_params: InitializedParams): void;
    update(newEnvironment: Partial<EnvironmentInfo>): void;
}
//# sourceMappingURL=environment.d.ts.map