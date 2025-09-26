/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Disposable } from './disposable.js';
import type { URI } from './uri-utils.js';
import type { LangiumSharedCoreServices } from '../services.js';
import type { DocumentState } from '../workspace/documents.js';
export declare abstract class DisposableCache implements Disposable {
    protected toDispose: Disposable[];
    protected isDisposed: boolean;
    onDispose(disposable: Disposable): void;
    dispose(): void;
    protected throwIfDisposed(): void;
    abstract clear(): void;
}
export declare class SimpleCache<K, V> extends DisposableCache {
    protected readonly cache: Map<K, V>;
    has(key: K): boolean;
    set(key: K, value: V): void;
    get(key: K): V | undefined;
    get(key: K, provider: () => V): V;
    delete(key: K): boolean;
    clear(): void;
}
export declare class ContextCache<Context, Key, Value, ContextKey = Context> extends DisposableCache {
    private readonly cache;
    private readonly converter;
    constructor(converter?: (input: Context) => ContextKey);
    has(contextKey: Context, key: Key): boolean;
    set(contextKey: Context, key: Key, value: Value): void;
    get(contextKey: Context, key: Key): Value | undefined;
    get(contextKey: Context, key: Key, provider: () => Value): Value;
    delete(contextKey: Context, key: Key): boolean;
    clear(): void;
    clear(contextKey: Context): void;
    protected cacheForContext(contextKey: Context): Map<Key, Value>;
}
/**
 * Every key/value pair in this cache is scoped to a document.
 * If this document is changed or deleted, all associated key/value pairs are deleted.
 */
export declare class DocumentCache<K, V> extends ContextCache<URI | string, K, V, string> {
    /**
     * Creates a new document cache.
     *
     * @param sharedServices Service container instance to hook into document lifecycle events.
     * @param state Optional document state on which the cache should evict.
     * If not provided, the cache will evict on `DocumentBuilder#onUpdate`.
     * *Deleted* documents are considered in both cases.
     *
     * Providing a state here will use `DocumentBuilder#onDocumentPhase` instead,
     * which triggers on all documents that have been affected by this change, assuming that the
     * state is `DocumentState.Linked` or a later state.
     */
    constructor(sharedServices: LangiumSharedCoreServices, state?: DocumentState);
}
/**
 * Every key/value pair in this cache is scoped to the whole workspace.
 * If any document in the workspace is added, changed or deleted, the whole cache is evicted.
 */
export declare class WorkspaceCache<K, V> extends SimpleCache<K, V> {
    /**
     * Creates a new workspace cache.
     *
     * @param sharedServices Service container instance to hook into document lifecycle events.
     * @param state Optional document state on which the cache should evict.
     * If not provided, the cache will evict on `DocumentBuilder#onUpdate`.
     * *Deleted* documents are considered in both cases.
     */
    constructor(sharedServices: LangiumSharedCoreServices, state?: DocumentState);
}
//# sourceMappingURL=caching.d.ts.map