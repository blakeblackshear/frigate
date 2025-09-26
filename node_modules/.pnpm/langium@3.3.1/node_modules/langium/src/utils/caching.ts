/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Disposable } from './disposable.js';
import type { URI } from './uri-utils.js';
import type { LangiumSharedCoreServices } from '../services.js';
import type { DocumentState } from '../workspace/documents.js';

export abstract class DisposableCache implements Disposable {

    protected toDispose: Disposable[] = [];
    protected isDisposed = false;

    onDispose(disposable: Disposable): void {
        this.toDispose.push(disposable);
    }

    dispose(): void {
        this.throwIfDisposed();
        this.clear();
        this.isDisposed = true;
        this.toDispose.forEach(disposable => disposable.dispose());
    }

    protected throwIfDisposed(): void {
        if (this.isDisposed) {
            throw new Error('This cache has already been disposed');
        }
    }

    abstract clear(): void;
}

export class SimpleCache<K, V> extends DisposableCache {
    protected readonly cache = new Map<K, V>();

    has(key: K): boolean {
        this.throwIfDisposed();
        return this.cache.has(key);
    }

    set(key: K, value: V): void {
        this.throwIfDisposed();
        this.cache.set(key, value);
    }

    get(key: K): V | undefined;
    get(key: K, provider: () => V): V;
    get(key: K, provider?: () => V): V | undefined {
        this.throwIfDisposed();
        if (this.cache.has(key)) {
            return this.cache.get(key);
        } else if (provider) {
            const value = provider();
            this.cache.set(key, value);
            return value;
        } else {
            return undefined;
        }
    }

    delete(key: K): boolean {
        this.throwIfDisposed();
        return this.cache.delete(key);
    }

    clear(): void {
        this.throwIfDisposed();
        this.cache.clear();
    }
}

export class ContextCache<Context, Key, Value, ContextKey = Context> extends DisposableCache {

    private readonly cache = new Map<ContextKey | Context, Map<Key, Value>>();
    private readonly converter: (input: Context) => ContextKey | Context;

    constructor(converter?: (input: Context) => ContextKey) {
        super();
        this.converter = converter ?? (value => value);
    }

    has(contextKey: Context, key: Key): boolean {
        this.throwIfDisposed();
        return this.cacheForContext(contextKey).has(key);
    }

    set(contextKey: Context, key: Key, value: Value): void {
        this.throwIfDisposed();
        this.cacheForContext(contextKey).set(key, value);
    }

    get(contextKey: Context, key: Key): Value | undefined;
    get(contextKey: Context, key: Key, provider: () => Value): Value;
    get(contextKey: Context, key: Key, provider?: () => Value): Value | undefined {
        this.throwIfDisposed();
        const contextCache = this.cacheForContext(contextKey);
        if (contextCache.has(key)) {
            return contextCache.get(key);
        } else if (provider) {
            const value = provider();
            contextCache.set(key, value);
            return value;
        } else {
            return undefined;
        }
    }

    delete(contextKey: Context, key: Key): boolean {
        this.throwIfDisposed();
        return this.cacheForContext(contextKey).delete(key);
    }

    clear(): void;
    clear(contextKey: Context): void;
    clear(contextKey?: Context): void {
        this.throwIfDisposed();
        if (contextKey) {
            const mapKey = this.converter(contextKey);
            this.cache.delete(mapKey);
        } else {
            this.cache.clear();
        }
    }

    protected cacheForContext(contextKey: Context): Map<Key, Value> {
        const mapKey = this.converter(contextKey);
        let documentCache = this.cache.get(mapKey);
        if (!documentCache) {
            documentCache = new Map();
            this.cache.set(mapKey, documentCache);
        }
        return documentCache;
    }
}

/**
 * Every key/value pair in this cache is scoped to a document.
 * If this document is changed or deleted, all associated key/value pairs are deleted.
 */
export class DocumentCache<K, V> extends ContextCache<URI | string, K, V, string> {

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
    constructor(sharedServices: LangiumSharedCoreServices, state?: DocumentState) {
        super(uri => uri.toString());
        if (state) {
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onDocumentPhase(state, document => {
                this.clear(document.uri.toString());
            }));
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onUpdate((_changed, deleted) => {
                for (const uri of deleted) { // react only on deleted documents
                    this.clear(uri);
                }
            }));
        } else {
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onUpdate((changed, deleted) => {
                const allUris = changed.concat(deleted); // react on both changed and deleted documents
                for (const uri of allUris) {
                    this.clear(uri);
                }
            }));
        }
    }
}

/**
 * Every key/value pair in this cache is scoped to the whole workspace.
 * If any document in the workspace is added, changed or deleted, the whole cache is evicted.
 */
export class WorkspaceCache<K, V> extends SimpleCache<K, V> {

    /**
     * Creates a new workspace cache.
     *
     * @param sharedServices Service container instance to hook into document lifecycle events.
     * @param state Optional document state on which the cache should evict.
     * If not provided, the cache will evict on `DocumentBuilder#onUpdate`.
     * *Deleted* documents are considered in both cases.
     */
    constructor(sharedServices: LangiumSharedCoreServices, state?: DocumentState) {
        super();
        if (state) {
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onBuildPhase(state, () => {
                this.clear();
            }));
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onUpdate((_changed, deleted) => {
                if (deleted.length > 0) { // react only on deleted documents
                    this.clear();
                }
            }));
        } else {
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onUpdate(() => { // react on both changed and deleted documents
                this.clear();
            }));
        }
    }
}
