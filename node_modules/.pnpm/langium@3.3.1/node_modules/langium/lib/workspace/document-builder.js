/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { Disposable } from '../utils/disposable.js';
import { MultiMap } from '../utils/collections.js';
import { OperationCancelled, interruptAndCheck, isOperationCancelled } from '../utils/promise-utils.js';
import { stream } from '../utils/stream.js';
import { ValidationCategory } from '../validation/validation-registry.js';
import { DocumentState } from './documents.js';
export class DefaultDocumentBuilder {
    constructor(services) {
        this.updateBuildOptions = {
            // Default: run only the built-in validation checks and those in the _fast_ category (includes those without category)
            validation: {
                categories: ['built-in', 'fast']
            }
        };
        this.updateListeners = [];
        this.buildPhaseListeners = new MultiMap();
        this.documentPhaseListeners = new MultiMap();
        this.buildState = new Map();
        this.documentBuildWaiters = new Map();
        this.currentState = DocumentState.Changed;
        this.langiumDocuments = services.workspace.LangiumDocuments;
        this.langiumDocumentFactory = services.workspace.LangiumDocumentFactory;
        this.textDocuments = services.workspace.TextDocuments;
        this.indexManager = services.workspace.IndexManager;
        this.serviceRegistry = services.ServiceRegistry;
    }
    async build(documents, options = {}, cancelToken = CancellationToken.None) {
        var _a, _b;
        for (const document of documents) {
            const key = document.uri.toString();
            if (document.state === DocumentState.Validated) {
                if (typeof options.validation === 'boolean' && options.validation) {
                    // Force re-running all validation checks
                    document.state = DocumentState.IndexedReferences;
                    document.diagnostics = undefined;
                    this.buildState.delete(key);
                }
                else if (typeof options.validation === 'object') {
                    const buildState = this.buildState.get(key);
                    const previousCategories = (_a = buildState === null || buildState === void 0 ? void 0 : buildState.result) === null || _a === void 0 ? void 0 : _a.validationChecks;
                    if (previousCategories) {
                        // Validation with explicit options was requested for a document that has already been partly validated.
                        // In this case, we need to merge the previous validation categories with the new ones.
                        const newCategories = (_b = options.validation.categories) !== null && _b !== void 0 ? _b : ValidationCategory.all;
                        const categories = newCategories.filter(c => !previousCategories.includes(c));
                        if (categories.length > 0) {
                            this.buildState.set(key, {
                                completed: false,
                                options: {
                                    validation: Object.assign(Object.assign({}, options.validation), { categories })
                                },
                                result: buildState.result
                            });
                            document.state = DocumentState.IndexedReferences;
                        }
                    }
                }
            }
            else {
                // Default: forget any previous build options
                this.buildState.delete(key);
            }
        }
        this.currentState = DocumentState.Changed;
        await this.emitUpdate(documents.map(e => e.uri), []);
        await this.buildDocuments(documents, options, cancelToken);
    }
    async update(changed, deleted, cancelToken = CancellationToken.None) {
        this.currentState = DocumentState.Changed;
        // Remove all metadata of documents that are reported as deleted
        for (const deletedUri of deleted) {
            this.langiumDocuments.deleteDocument(deletedUri);
            this.buildState.delete(deletedUri.toString());
            this.indexManager.remove(deletedUri);
        }
        // Set the state of all changed documents to `Changed` so they are completely rebuilt
        for (const changedUri of changed) {
            const invalidated = this.langiumDocuments.invalidateDocument(changedUri);
            if (!invalidated) {
                // We create an unparsed, invalid document.
                // This will be parsed as soon as we reach the first document builder phase.
                // This allows to cancel the parsing process later in case we need it.
                const newDocument = this.langiumDocumentFactory.fromModel({ $type: 'INVALID' }, changedUri);
                newDocument.state = DocumentState.Changed;
                this.langiumDocuments.addDocument(newDocument);
            }
            this.buildState.delete(changedUri.toString());
        }
        // Set the state of all documents that should be relinked to `ComputedScopes` (if not already lower)
        const allChangedUris = stream(changed).concat(deleted).map(uri => uri.toString()).toSet();
        this.langiumDocuments.all
            .filter(doc => !allChangedUris.has(doc.uri.toString()) && this.shouldRelink(doc, allChangedUris))
            .forEach(doc => {
            const linker = this.serviceRegistry.getServices(doc.uri).references.Linker;
            linker.unlink(doc);
            doc.state = Math.min(doc.state, DocumentState.ComputedScopes);
            doc.diagnostics = undefined;
        });
        // Notify listeners of the update
        await this.emitUpdate(changed, deleted);
        // Only allow interrupting the execution after all state changes are done
        await interruptAndCheck(cancelToken);
        // Collect and sort all documents that we should rebuild
        const rebuildDocuments = this.sortDocuments(this.langiumDocuments.all
            .filter(doc => {
            var _a;
            // This includes those that were reported as changed and those that we selected for relinking
            return doc.state < DocumentState.Linked
                // This includes those for which a previous build has been cancelled
                || !((_a = this.buildState.get(doc.uri.toString())) === null || _a === void 0 ? void 0 : _a.completed);
        })
            .toArray());
        await this.buildDocuments(rebuildDocuments, this.updateBuildOptions, cancelToken);
    }
    async emitUpdate(changed, deleted) {
        await Promise.all(this.updateListeners.map(listener => listener(changed, deleted)));
    }
    /**
     * Sort the given documents by priority. By default, documents with an open text document are prioritized.
     * This is useful to ensure that visible documents show their diagnostics before all other documents.
     *
     * This improves the responsiveness in large workspaces as users usually don't care about diagnostics
     * in files that are currently not opened in the editor.
     */
    sortDocuments(documents) {
        let left = 0;
        let right = documents.length - 1;
        while (left < right) {
            while (left < documents.length && this.hasTextDocument(documents[left])) {
                left++;
            }
            while (right >= 0 && !this.hasTextDocument(documents[right])) {
                right--;
            }
            if (left < right) {
                [documents[left], documents[right]] = [documents[right], documents[left]];
            }
        }
        return documents;
    }
    hasTextDocument(doc) {
        var _a;
        return Boolean((_a = this.textDocuments) === null || _a === void 0 ? void 0 : _a.get(doc.uri));
    }
    /**
     * Check whether the given document should be relinked after changes were found in the given URIs.
     */
    shouldRelink(document, changedUris) {
        // Relink documents with linking errors -- maybe those references can be resolved now
        if (document.references.some(ref => ref.error !== undefined)) {
            return true;
        }
        // Check whether the document is affected by any of the changed URIs
        return this.indexManager.isAffected(document, changedUris);
    }
    onUpdate(callback) {
        this.updateListeners.push(callback);
        return Disposable.create(() => {
            const index = this.updateListeners.indexOf(callback);
            if (index >= 0) {
                this.updateListeners.splice(index, 1);
            }
        });
    }
    /**
     * Build the given documents by stepping through all build phases. If a document's state indicates
     * that a certain build phase is already done, the phase is skipped for that document.
     *
     * @param documents The documents to build.
     * @param options the {@link BuildOptions} to use.
     * @param cancelToken A cancellation token that can be used to cancel the build.
     * @returns A promise that resolves when the build is done.
     */
    async buildDocuments(documents, options, cancelToken) {
        this.prepareBuild(documents, options);
        // 0. Parse content
        await this.runCancelable(documents, DocumentState.Parsed, cancelToken, doc => this.langiumDocumentFactory.update(doc, cancelToken));
        // 1. Index content
        await this.runCancelable(documents, DocumentState.IndexedContent, cancelToken, doc => this.indexManager.updateContent(doc, cancelToken));
        // 2. Compute scopes
        await this.runCancelable(documents, DocumentState.ComputedScopes, cancelToken, async (doc) => {
            const scopeComputation = this.serviceRegistry.getServices(doc.uri).references.ScopeComputation;
            doc.precomputedScopes = await scopeComputation.computeLocalScopes(doc, cancelToken);
        });
        // 3. Linking
        await this.runCancelable(documents, DocumentState.Linked, cancelToken, doc => {
            const linker = this.serviceRegistry.getServices(doc.uri).references.Linker;
            return linker.link(doc, cancelToken);
        });
        // 4. Index references
        await this.runCancelable(documents, DocumentState.IndexedReferences, cancelToken, doc => this.indexManager.updateReferences(doc, cancelToken));
        // 5. Validation
        const toBeValidated = documents.filter(doc => this.shouldValidate(doc));
        await this.runCancelable(toBeValidated, DocumentState.Validated, cancelToken, doc => this.validate(doc, cancelToken));
        // If we've made it to this point without being cancelled, we can mark the build state as completed.
        for (const doc of documents) {
            const state = this.buildState.get(doc.uri.toString());
            if (state) {
                state.completed = true;
            }
        }
    }
    /**
     * Runs prior to beginning the build process to update the {@link DocumentBuildState} for each document
     *
     * @param documents collection of documents to be built
     * @param options the {@link BuildOptions} to use
     */
    prepareBuild(documents, options) {
        for (const doc of documents) {
            const key = doc.uri.toString();
            const state = this.buildState.get(key);
            // If the document has no previous build state, we set it. If it has one, but it's already marked
            // as completed, we overwrite it. If the previous build was not completed, we keep its state
            // and continue where it was cancelled.
            if (!state || state.completed) {
                this.buildState.set(key, {
                    completed: false,
                    options,
                    result: state === null || state === void 0 ? void 0 : state.result
                });
            }
        }
    }
    /**
     * Runs a cancelable operation on a set of documents to bring them to a specified {@link DocumentState}.
     *
     * @param documents The array of documents to process.
     * @param targetState The target {@link DocumentState} to bring the documents to.
     * @param cancelToken A token that can be used to cancel the operation.
     * @param callback A function to be called for each document.
     * @returns A promise that resolves when all documents have been processed or the operation is canceled.
     * @throws Will throw `OperationCancelled` if the operation is canceled via a `CancellationToken`.
     */
    async runCancelable(documents, targetState, cancelToken, callback) {
        const filtered = documents.filter(doc => doc.state < targetState);
        for (const document of filtered) {
            await interruptAndCheck(cancelToken);
            await callback(document);
            document.state = targetState;
            await this.notifyDocumentPhase(document, targetState, cancelToken);
        }
        // Do not use `filtered` here, as that will miss documents that have previously reached the current target state
        // For example, this happens in case the cancellation triggers between the processing of two documents
        // Or files that were picked up during the workspace initialization
        const targetStateDocs = documents.filter(doc => doc.state === targetState);
        await this.notifyBuildPhase(targetStateDocs, targetState, cancelToken);
        this.currentState = targetState;
    }
    onBuildPhase(targetState, callback) {
        this.buildPhaseListeners.add(targetState, callback);
        return Disposable.create(() => {
            this.buildPhaseListeners.delete(targetState, callback);
        });
    }
    onDocumentPhase(targetState, callback) {
        this.documentPhaseListeners.add(targetState, callback);
        return Disposable.create(() => {
            this.documentPhaseListeners.delete(targetState, callback);
        });
    }
    waitUntil(state, uriOrToken, cancelToken) {
        let uri = undefined;
        if (uriOrToken && 'path' in uriOrToken) {
            uri = uriOrToken;
        }
        else {
            cancelToken = uriOrToken;
        }
        cancelToken !== null && cancelToken !== void 0 ? cancelToken : (cancelToken = CancellationToken.None);
        if (uri) {
            const document = this.langiumDocuments.getDocument(uri);
            if (document && document.state > state) {
                return Promise.resolve(uri);
            }
        }
        if (this.currentState >= state) {
            return Promise.resolve(undefined);
        }
        else if (cancelToken.isCancellationRequested) {
            return Promise.reject(OperationCancelled);
        }
        return new Promise((resolve, reject) => {
            const buildDisposable = this.onBuildPhase(state, () => {
                buildDisposable.dispose();
                cancelDisposable.dispose();
                if (uri) {
                    const document = this.langiumDocuments.getDocument(uri);
                    resolve(document === null || document === void 0 ? void 0 : document.uri);
                }
                else {
                    resolve(undefined);
                }
            });
            const cancelDisposable = cancelToken.onCancellationRequested(() => {
                buildDisposable.dispose();
                cancelDisposable.dispose();
                reject(OperationCancelled);
            });
        });
    }
    async notifyDocumentPhase(document, state, cancelToken) {
        const listeners = this.documentPhaseListeners.get(state);
        const listenersCopy = listeners.slice();
        for (const listener of listenersCopy) {
            try {
                await listener(document, cancelToken);
            }
            catch (err) {
                // Ignore cancellation errors
                // We want to finish the listeners before throwing
                if (!isOperationCancelled(err)) {
                    throw err;
                }
            }
        }
    }
    async notifyBuildPhase(documents, state, cancelToken) {
        if (documents.length === 0) {
            // Don't notify when no document has been processed
            return;
        }
        const listeners = this.buildPhaseListeners.get(state);
        const listenersCopy = listeners.slice();
        for (const listener of listenersCopy) {
            await interruptAndCheck(cancelToken);
            await listener(documents, cancelToken);
        }
    }
    /**
     * Determine whether the given document should be validated during a build. The default
     * implementation checks the `validation` property of the build options. If it's set to `true`
     * or a `ValidationOptions` object, the document is included in the validation phase.
     */
    shouldValidate(document) {
        return Boolean(this.getBuildOptions(document).validation);
    }
    /**
     * Run validation checks on the given document and store the resulting diagnostics in the document.
     * If the document already contains diagnostics, the new ones are added to the list.
     */
    async validate(document, cancelToken) {
        var _a, _b;
        const validator = this.serviceRegistry.getServices(document.uri).validation.DocumentValidator;
        const validationSetting = this.getBuildOptions(document).validation;
        const options = typeof validationSetting === 'object' ? validationSetting : undefined;
        const diagnostics = await validator.validateDocument(document, options, cancelToken);
        if (document.diagnostics) {
            document.diagnostics.push(...diagnostics);
        }
        else {
            document.diagnostics = diagnostics;
        }
        // Store information about the executed validation in the build state
        const state = this.buildState.get(document.uri.toString());
        if (state) {
            (_a = state.result) !== null && _a !== void 0 ? _a : (state.result = {});
            const newCategories = (_b = options === null || options === void 0 ? void 0 : options.categories) !== null && _b !== void 0 ? _b : ValidationCategory.all;
            if (state.result.validationChecks) {
                state.result.validationChecks.push(...newCategories);
            }
            else {
                state.result.validationChecks = [...newCategories];
            }
        }
    }
    getBuildOptions(document) {
        var _a, _b;
        return (_b = (_a = this.buildState.get(document.uri.toString())) === null || _a === void 0 ? void 0 : _a.options) !== null && _b !== void 0 ? _b : {};
    }
}
//# sourceMappingURL=document-builder.js.map