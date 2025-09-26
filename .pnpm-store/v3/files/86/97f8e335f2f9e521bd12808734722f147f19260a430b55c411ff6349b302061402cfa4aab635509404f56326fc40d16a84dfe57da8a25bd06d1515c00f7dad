/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { assertUnreachable } from '../index.js';
import { MultiMap } from '../utils/collections.js';
import { isOperationCancelled } from '../utils/promise-utils.js';
import { stream } from '../utils/stream.js';
/**
 * Create DiagnosticData for a given diagnostic code. The result can be put into the `data` field of a DiagnosticInfo.
 */
export function diagnosticData(code) {
    return { code };
}
export var ValidationCategory;
(function (ValidationCategory) {
    ValidationCategory.all = ['fast', 'slow', 'built-in'];
})(ValidationCategory || (ValidationCategory = {}));
/**
 * Manages a set of `ValidationCheck`s to be applied when documents are validated.
 */
export class ValidationRegistry {
    constructor(services) {
        this.entries = new MultiMap();
        this.entriesBefore = [];
        this.entriesAfter = [];
        this.reflection = services.shared.AstReflection;
    }
    /**
     * Register a set of validation checks. Each value in the record can be either a single validation check (i.e. a function)
     * or an array of validation checks.
     *
     * @param checksRecord Set of validation checks to register.
     * @param category Optional category for the validation checks (defaults to `'fast'`).
     * @param thisObj Optional object to be used as `this` when calling the validation check functions.
     */
    register(checksRecord, thisObj = this, category = 'fast') {
        if (category === 'built-in') {
            throw new Error("The 'built-in' category is reserved for lexer, parser, and linker errors.");
        }
        for (const [type, ch] of Object.entries(checksRecord)) {
            const callbacks = ch;
            if (Array.isArray(callbacks)) {
                for (const check of callbacks) {
                    const entry = {
                        check: this.wrapValidationException(check, thisObj),
                        category
                    };
                    this.addEntry(type, entry);
                }
            }
            else if (typeof callbacks === 'function') {
                const entry = {
                    check: this.wrapValidationException(callbacks, thisObj),
                    category
                };
                this.addEntry(type, entry);
            }
            else {
                assertUnreachable(callbacks);
            }
        }
    }
    wrapValidationException(check, thisObj) {
        return async (node, accept, cancelToken) => {
            await this.handleException(() => check.call(thisObj, node, accept, cancelToken), 'An error occurred during validation', accept, node);
        };
    }
    async handleException(functionality, messageContext, accept, node) {
        try {
            await functionality();
        }
        catch (err) {
            if (isOperationCancelled(err)) {
                throw err;
            }
            console.error(`${messageContext}:`, err);
            if (err instanceof Error && err.stack) {
                console.error(err.stack);
            }
            const messageDetails = err instanceof Error ? err.message : String(err);
            accept('error', `${messageContext}: ${messageDetails}`, { node });
        }
    }
    addEntry(type, entry) {
        if (type === 'AstNode') {
            this.entries.add('AstNode', entry);
            return;
        }
        for (const subtype of this.reflection.getAllSubTypes(type)) {
            this.entries.add(subtype, entry);
        }
    }
    getChecks(type, categories) {
        let checks = stream(this.entries.get(type))
            .concat(this.entries.get('AstNode'));
        if (categories) {
            checks = checks.filter(entry => categories.includes(entry.category));
        }
        return checks.map(entry => entry.check);
    }
    /**
     * Register logic which will be executed once before validating all the nodes of an AST/Langium document.
     * This helps to prepare or initialize some information which are required or reusable for the following checks on the AstNodes.
     *
     * As an example, for validating unique fully-qualified names of nodes in the AST,
     * here the map for mapping names to nodes could be established.
     * During the usual checks on the nodes, they are put into this map with their name.
     *
     * Note that this approach makes validations stateful, which is relevant e.g. when cancelling the validation.
     * Therefore it is recommended to clear stored information
     * _before_ validating an AST to validate each AST unaffected from other ASTs
     * AND _after_ validating the AST to free memory by information which are no longer used.
     *
     * @param checkBefore a set-up function which will be called once before actually validating an AST
     * @param thisObj Optional object to be used as `this` when calling the validation check functions.
     */
    registerBeforeDocument(checkBefore, thisObj = this) {
        this.entriesBefore.push(this.wrapPreparationException(checkBefore, 'An error occurred during set-up of the validation', thisObj));
    }
    /**
     * Register logic which will be executed once after validating all the nodes of an AST/Langium document.
     * This helps to finally evaluate information which are collected during the checks on the AstNodes.
     *
     * As an example, for validating unique fully-qualified names of nodes in the AST,
     * here the map with all the collected nodes and their names is checked
     * and validation hints are created for all nodes with the same name.
     *
     * Note that this approach makes validations stateful, which is relevant e.g. when cancelling the validation.
     * Therefore it is recommended to clear stored information
     * _before_ validating an AST to validate each AST unaffected from other ASTs
     * AND _after_ validating the AST to free memory by information which are no longer used.
     *
     * @param checkBefore a set-up function which will be called once before actually validating an AST
     * @param thisObj Optional object to be used as `this` when calling the validation check functions.
     */
    registerAfterDocument(checkAfter, thisObj = this) {
        this.entriesAfter.push(this.wrapPreparationException(checkAfter, 'An error occurred during tear-down of the validation', thisObj));
    }
    wrapPreparationException(check, messageContext, thisObj) {
        return async (rootNode, accept, categories, cancelToken) => {
            await this.handleException(() => check.call(thisObj, rootNode, accept, categories, cancelToken), messageContext, accept, rootNode);
        };
    }
    get checksBefore() {
        return this.entriesBefore;
    }
    get checksAfter() {
        return this.entriesAfter;
    }
}
//# sourceMappingURL=validation-registry.js.map