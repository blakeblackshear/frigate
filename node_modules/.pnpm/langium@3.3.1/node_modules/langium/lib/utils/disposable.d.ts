/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export interface Disposable {
    /**
     * Dispose this object.
     */
    dispose(): void;
}
export interface AsyncDisposable {
    /**
     * Dispose this object.
     */
    dispose(): Promise<void>;
}
export declare namespace Disposable {
    function create(callback: () => Promise<void>): AsyncDisposable;
    function create(callback: () => void): Disposable;
}
//# sourceMappingURL=disposable.d.ts.map