/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { CodeDescription, DiagnosticRelatedInformation, DiagnosticTag, integer, Range } from 'vscode-languageserver-types';
import { assertUnreachable } from '../index.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstReflection, Properties } from '../syntax-tree.js';
import type { CancellationToken } from '../utils/cancellation.js';
import { MultiMap } from '../utils/collections.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import { isOperationCancelled } from '../utils/promise-utils.js';
import type { Stream } from '../utils/stream.js';
import { stream } from '../utils/stream.js';
import type { DocumentSegment } from '../workspace/documents.js';

export type DiagnosticInfo<N extends AstNode, P extends string = Properties<N>> = {
    /** The AST node to which the diagnostic is attached. */
    node: N;
    /** If a property name is given, the diagnostic is restricted to the corresponding text region. */
    property?: P;
    /** If the value of a keyword is given, the diagnostic will appear at its corresponding text region */
    keyword?: string;
    /** In case of a multi-value property (array), an index can be given to select a specific element. */
    index?: number;
    /** If you want to create a diagnostic independent to any property, use the range property. */
    range?: Range;
    /** The diagnostic's code, which usually appear in the user interface. */
    code?: integer | string;
    /** An optional property to describe the error code. */
    codeDescription?: CodeDescription;
    /** Additional metadata about the diagnostic. */
    tags?: DiagnosticTag[];
    /** An array of related diagnostic information, e.g. when symbol-names within a scope collide all definitions can be marked via this property. */
    relatedInformation?: DiagnosticRelatedInformation[];
    /** A data entry field that is preserved between a `textDocument/publishDiagnostics` notification and `textDocument/codeAction` request. */
    data?: unknown;
}

/**
 * Shape of information commonly used in the `data` field of diagnostics.
 */
export interface DiagnosticData {
    /** Diagnostic code for identifying which code action to apply. This code is _not_ shown in the user interface. */
    code: string
    /** Specifies where to apply the code action in the form of a `DocumentSegment`. */
    actionSegment?: DocumentSegment
    /** Specifies where to apply the code action in the form of a `Range`. */
    actionRange?: Range
}

/**
 * Create DiagnosticData for a given diagnostic code. The result can be put into the `data` field of a DiagnosticInfo.
 */
export function diagnosticData(code: string): DiagnosticData {
    return { code };
}

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'hint';

export type ValidationAcceptor = <N extends AstNode>(severity: ValidationSeverity, message: string, info: DiagnosticInfo<N>) => void

export type ValidationCheck<T extends AstNode = AstNode> = (node: T, accept: ValidationAcceptor, cancelToken: CancellationToken) => MaybePromise<void>;

/**
 * A utility type for describing functions which will be called once before or after all the AstNodes of an AST/Langium document are validated.
 *
 * The AST is represented by its root AstNode.
 *
 * The given validation acceptor helps to report some early or lately detected issues.
 *
 * The 'categories' indicate, which validation categories are executed for all the AstNodes.
 * This helps to tailor the preparations/tear-down logic to the actually executed checks on the nodes.
 *
 * It is recommended to support interrupts during long-running logic with 'interruptAndCheck(cancelToken)'.
 */
export type ValidationPreparation = (rootNode: AstNode, accept: ValidationAcceptor, categories: ValidationCategory[], cancelToken: CancellationToken) => MaybePromise<void>;

/**
 * A utility type for associating non-primitive AST types to corresponding validation checks. For example:
 *
 * ```ts
 *   const checks: ValidationChecks<StatemachineAstType> = {
 *       State: validator.checkStateNameStartsWithCapital
 *    };
 * ```
 *
 * If an AST type does not extend AstNode, e.g. if it describes a union of string literals, that type's name must not occur as a key in objects of type `ValidationCheck<...>`.
 *
 * @param T a type definition mapping language specific type names (keys) to the corresponding types (values)
 */
export type ValidationChecks<T> = {
    [K in keyof T]?: T[K] extends AstNode ? ValidationCheck<T[K]> | Array<ValidationCheck<T[K]>> : never
} & {
    AstNode?: ValidationCheck<AstNode> | Array<ValidationCheck<AstNode>>;
}

/**
 * `fast` checks can be executed after every document change (i.e. as the user is typing). If a check
 * is too slow it can delay the response to document changes, yielding bad user experience. By marking
 * it as `slow`, it will be skipped for normal as-you-type validation. Then it's up to you when to
 * schedule these long-running checks: after the fast checks are done, or after saving a document,
 * or with an explicit command, etc.
 *
 * `built-in` checks are errors produced by the lexer, the parser, or the linker. They cannot be used
 * for custom validation checks.
 */
export type ValidationCategory = 'fast' | 'slow' | 'built-in'

export namespace ValidationCategory {
    export const all: readonly ValidationCategory[] = ['fast', 'slow', 'built-in'];
}

type ValidationCheckEntry = {
    check: ValidationCheck
    category: ValidationCategory
}

/**
 * Manages a set of `ValidationCheck`s to be applied when documents are validated.
 */
export class ValidationRegistry {
    private readonly entries = new MultiMap<string, ValidationCheckEntry>();
    private readonly reflection: AstReflection;

    private entriesBefore: ValidationPreparation[] = [];
    private entriesAfter: ValidationPreparation[] = [];

    constructor(services: LangiumCoreServices) {
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
    register<T>(checksRecord: ValidationChecks<T>, thisObj: ThisParameterType<unknown> = this, category: ValidationCategory = 'fast'): void {
        if (category === 'built-in') {
            throw new Error("The 'built-in' category is reserved for lexer, parser, and linker errors.");
        }
        for (const [type, ch] of Object.entries(checksRecord)) {
            const callbacks = ch as ValidationCheck | ValidationCheck[];
            if (Array.isArray(callbacks)) {
                for (const check of callbacks) {
                    const entry: ValidationCheckEntry = {
                        check: this.wrapValidationException(check, thisObj),
                        category
                    };
                    this.addEntry(type, entry);
                }
            } else if (typeof callbacks === 'function') {
                const entry: ValidationCheckEntry = {
                    check: this.wrapValidationException(callbacks, thisObj),
                    category
                };
                this.addEntry(type, entry);
            } else {
                assertUnreachable(callbacks);
            }
        }
    }

    protected wrapValidationException(check: ValidationCheck, thisObj: unknown): ValidationCheck {
        return async (node, accept, cancelToken) => {
            await this.handleException(() => check.call(thisObj, node, accept, cancelToken), 'An error occurred during validation', accept, node);
        };
    }

    protected async handleException(functionality: () => MaybePromise<void>, messageContext: string, accept: ValidationAcceptor, node: AstNode): Promise<void> {
        try {
            await functionality();
        } catch (err) {
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

    protected addEntry(type: string, entry: ValidationCheckEntry): void {
        if (type === 'AstNode') {
            this.entries.add('AstNode', entry);
            return;
        }
        for (const subtype of this.reflection.getAllSubTypes(type)) {
            this.entries.add(subtype, entry);
        }
    }

    getChecks(type: string, categories?: ValidationCategory[]): Stream<ValidationCheck> {
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
    registerBeforeDocument(checkBefore: ValidationPreparation, thisObj: ThisParameterType<unknown> = this): void {
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
    registerAfterDocument(checkAfter: ValidationPreparation, thisObj: ThisParameterType<unknown> = this): void {
        this.entriesAfter.push(this.wrapPreparationException(checkAfter, 'An error occurred during tear-down of the validation', thisObj));
    }

    protected wrapPreparationException(check: ValidationPreparation, messageContext: string, thisObj: unknown): ValidationPreparation {
        return async (rootNode, accept, categories, cancelToken) => {
            await this.handleException(() => check.call(thisObj, rootNode, accept, categories, cancelToken), messageContext, accept, rootNode);
        };
    }

    get checksBefore(): ValidationPreparation[] {
        return this.entriesBefore;
    }

    get checksAfter(): ValidationPreparation[] {
        return this.entriesAfter;
    }

}
