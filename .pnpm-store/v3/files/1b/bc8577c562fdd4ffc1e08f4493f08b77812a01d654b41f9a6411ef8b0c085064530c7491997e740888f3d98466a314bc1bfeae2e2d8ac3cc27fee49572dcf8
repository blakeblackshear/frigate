/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class DisposableCache {
    constructor() {
        this.toDispose = [];
        this.isDisposed = false;
    }
    onDispose(disposable) {
        this.toDispose.push(disposable);
    }
    dispose() {
        this.throwIfDisposed();
        this.clear();
        this.isDisposed = true;
        this.toDispose.forEach(disposable => disposable.dispose());
    }
    throwIfDisposed() {
        if (this.isDisposed) {
            throw new Error('This cache has already been disposed');
        }
    }
}
export class SimpleCache extends DisposableCache {
    constructor() {
        super(...arguments);
        this.cache = new Map();
    }
    has(key) {
        this.throwIfDisposed();
        return this.cache.has(key);
    }
    set(key, value) {
        this.throwIfDisposed();
        this.cache.set(key, value);
    }
    get(key, provider) {
        this.throwIfDisposed();
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        else if (provider) {
            const value = provider();
            this.cache.set(key, value);
            return value;
        }
        else {
            return undefined;
        }
    }
    delete(key) {
        this.throwIfDisposed();
        return this.cache.delete(key);
    }
    clear() {
        this.throwIfDisposed();
        this.cache.clear();
    }
}
export class ContextCache extends DisposableCache {
    constructor(converter) {
        super();
        this.cache = new Map();
        this.converter = converter !== null && converter !== void 0 ? converter : (value => value);
    }
    has(contextKey, key) {
        this.throwIfDisposed();
        return this.cacheForContext(contextKey).has(key);
    }
    set(contextKey, key, value) {
        this.throwIfDisposed();
        this.cacheForContext(contextKey).set(key, value);
    }
    get(contextKey, key, provider) {
        this.throwIfDisposed();
        const contextCache = this.cacheForContext(contextKey);
        if (contextCache.has(key)) {
            return contextCache.get(key);
        }
        else if (provider) {
            const value = provider();
            contextCache.set(key, value);
            return value;
        }
        else {
            return undefined;
        }
    }
    delete(contextKey, key) {
        this.throwIfDisposed();
        return this.cacheForContext(contextKey).delete(key);
    }
    clear(contextKey) {
        this.throwIfDisposed();
        if (contextKey) {
            const mapKey = this.converter(contextKey);
            this.cache.delete(mapKey);
        }
        else {
            this.cache.clear();
        }
    }
    cacheForContext(contextKey) {
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
export class DocumentCache extends ContextCache {
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
    constructor(sharedServices, state) {
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
        }
        else {
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
export class WorkspaceCache extends SimpleCache {
    /**
     * Creates a new workspace cache.
     *
     * @param sharedServices Service container instance to hook into document lifecycle events.
     * @param state Optional document state on which the cache should evict.
     * If not provided, the cache will evict on `DocumentBuilder#onUpdate`.
     * *Deleted* documents are considered in both cases.
     */
    constructor(sharedServices, state) {
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
        }
        else {
            this.toDispose.push(sharedServices.workspace.DocumentBuilder.onUpdate(() => {
                this.clear();
            }));
        }
    }
}
//# sourceMappingURL=caching.js.map