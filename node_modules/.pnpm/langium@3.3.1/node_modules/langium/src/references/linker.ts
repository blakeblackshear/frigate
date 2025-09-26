/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, AstReflection, CstNode, LinkingError, Reference, ReferenceInfo } from '../syntax-tree.js';
import type { AstNodeLocator } from '../workspace/ast-node-locator.js';
import type { LangiumDocument, LangiumDocuments } from '../workspace/documents.js';
import type { ScopeProvider } from './scope-provider.js';
import { CancellationToken } from '../utils/cancellation.js';
import { isAstNode, isAstNodeDescription, isLinkingError } from '../syntax-tree.js';
import { findRootNode, streamAst, streamReferences } from '../utils/ast-utils.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
import { DocumentState } from '../workspace/documents.js';

/**
 * Language-specific service for resolving cross-references in the AST.
 */
export interface Linker {

    /**
     * Links all cross-references within the specified document. The default implementation loads only target
     * elements from documents that are present in the `LangiumDocuments` service. The linked references are
     * stored in the document's `references` property.
     *
     * @param document A LangiumDocument that shall be linked.
     * @param cancelToken A token for cancelling the operation.
     *
     * @throws `OperationCancelled` if a cancellation event is detected
     */
    link(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void>;

    /**
     * Unlinks all references within the specified document and removes them from the list of `references`.
     *
     * @param document A LangiumDocument that shall be unlinked.
     */
    unlink(document: LangiumDocument): void;

    /**
     * Determines a candidate AST node description for linking the given reference.
     *
     * @param refInfo Information about the reference.
     */
    getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError;

    /**
     * Creates a cross reference node being aware of its containing AstNode, the corresponding CstNode,
     * the cross reference text denoting the target AstNode being already extracted of the document text,
     * as well as the unique cross reference identifier.
     *
     * Default behavior:
     *  - The returned Reference's 'ref' property pointing to the target AstNode is populated lazily on its
     *    first visit.
     *  - If the target AstNode cannot be resolved on the first visit, an error indicator will be installed
     *    and further resolution attempts will *not* be performed.
     *
     * @param node The containing AST node
     * @param property The AST node property being referenced
     * @param refNode The corresponding CST node
     * @param refText The cross reference text denoting the target AstNode
     * @returns the desired Reference node, whose behavior wrt. resolving the cross reference is implementation specific.
     */
    buildReference(node: AstNode, property: string, refNode: CstNode | undefined, refText: string): Reference;

}

const ref_resolving = Symbol('ref_resolving');

interface DefaultReference extends Reference {
    _ref?: AstNode | LinkingError | typeof ref_resolving;
    _nodeDescription?: AstNodeDescription;
}

export class DefaultLinker implements Linker {
    protected readonly reflection: AstReflection;
    protected readonly scopeProvider: ScopeProvider;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly langiumDocuments: () => LangiumDocuments;

    constructor(services: LangiumCoreServices) {
        this.reflection = services.shared.AstReflection;
        this.langiumDocuments = () => services.shared.workspace.LangiumDocuments;
        this.scopeProvider = services.references.ScopeProvider;
        this.astNodeLocator = services.workspace.AstNodeLocator;
    }

    async link(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        for (const node of streamAst(document.parseResult.value)) {
            await interruptAndCheck(cancelToken);
            streamReferences(node).forEach(ref => this.doLink(ref, document));
        }
    }

    protected doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
        const ref = refInfo.reference as DefaultReference;
        // The reference may already have been resolved lazily by accessing its `ref` property.
        if (ref._ref === undefined) {
            ref._ref = ref_resolving;
            try {
                const description = this.getCandidate(refInfo);
                if (isLinkingError(description)) {
                    ref._ref = description;
                } else {
                    ref._nodeDescription = description;
                    if (this.langiumDocuments().hasDocument(description.documentUri)) {
                        // The target document is already loaded
                        const linkedNode = this.loadAstNode(description);
                        ref._ref = linkedNode ?? this.createLinkingError(refInfo, description);
                    } else {
                        // Try to load the target AST node later using the already provided description
                        ref._ref = undefined;
                    }
                }
            } catch (err) {
                console.error(`An error occurred while resolving reference to '${ref.$refText}':`, err);
                const errorMessage = (err as Error).message ?? String(err);
                ref._ref = {
                    ...refInfo,
                    message: `An error occurred while resolving reference to '${ref.$refText}': ${errorMessage}`
                };
            }
            // Add the reference to the document's array of references
            // Only add if the reference has been not been resolved earlier
            // Otherwise we end up with duplicates
            // See also implementation of `buildReference`
            document.references.push(ref);
        }
    }

    unlink(document: LangiumDocument): void {
        for (const ref of document.references) {
            delete (ref as DefaultReference)._ref;
            delete (ref as DefaultReference)._nodeDescription;
        }
        document.references = [];
    }

    getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        const scope = this.scopeProvider.getScope(refInfo);
        const description = scope.getElement(refInfo.reference.$refText);
        return description ?? this.createLinkingError(refInfo);
    }

    buildReference(node: AstNode, property: string, refNode: CstNode | undefined, refText: string): Reference {
        // See behavior description in doc of Linker, update that on changes in here.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const linker = this;
        const reference: DefaultReference = {
            $refNode: refNode,
            $refText: refText,

            get ref() {
                if (isAstNode(this._ref)) {
                    // Most frequent case: the target is already resolved.
                    return this._ref;
                } else if (isAstNodeDescription(this._nodeDescription)) {
                    // A candidate has been found before, but it is not loaded yet.
                    const linkedNode = linker.loadAstNode(this._nodeDescription);
                    this._ref = linkedNode ??
                        linker.createLinkingError({ reference, container: node, property }, this._nodeDescription);
                } else if (this._ref === undefined) {
                    // The reference has not been linked yet, so do that now.
                    this._ref = ref_resolving;
                    const document = findRootNode(node).$document;
                    const refData = linker.getLinkedNode({ reference, container: node, property });
                    if (refData.error && document && document.state < DocumentState.ComputedScopes) {
                        // Document scope is not ready, don't set `this._ref` so linker can retry later.
                        return this._ref = undefined;
                    }
                    this._ref = refData.node ?? refData.error;
                    this._nodeDescription = refData.descr;
                    document?.references.push(this);
                } else if (this._ref === ref_resolving) {
                    throw new Error(`Cyclic reference resolution detected: ${linker.astNodeLocator.getAstNodePath(node)}/${property} (symbol '${refText}')`);
                }
                return isAstNode(this._ref) ? this._ref : undefined;
            },
            get $nodeDescription() {
                return this._nodeDescription;
            },
            get error() {
                return isLinkingError(this._ref) ? this._ref : undefined;
            }
        };
        return reference;
    }

    protected getLinkedNode(refInfo: ReferenceInfo): { node?: AstNode, descr?: AstNodeDescription, error?: LinkingError } {
        try {
            const description = this.getCandidate(refInfo);
            if (isLinkingError(description)) {
                return { error: description };
            }
            const linkedNode = this.loadAstNode(description);
            if (linkedNode) {
                return { node: linkedNode, descr: description };
            }
            else {
                return {
                    descr: description,
                    error:
                        this.createLinkingError(refInfo, description)
                };
            }
        } catch (err) {
            console.error(`An error occurred while resolving reference to '${refInfo.reference.$refText}':`, err);
            const errorMessage = (err as Error).message ?? String(err);
            return {
                error: {
                    ...refInfo,
                    message: `An error occurred while resolving reference to '${refInfo.reference.$refText}': ${errorMessage}`
                }
            };
        }
    }

    protected loadAstNode(nodeDescription: AstNodeDescription): AstNode | undefined {
        if (nodeDescription.node) {
            return nodeDescription.node;
        }
        const doc = this.langiumDocuments().getDocument(nodeDescription.documentUri);
        if (!doc) {
            return undefined;
        }
        return this.astNodeLocator.getAstNode(doc.parseResult.value, nodeDescription.path);
    }

    protected createLinkingError(refInfo: ReferenceInfo, targetDescription?: AstNodeDescription): LinkingError {
        // Check whether the document is sufficiently processed by the DocumentBuilder. If not, this is a hint for a bug
        // in the language implementation.
        const document = findRootNode(refInfo.container).$document;
        if (document && document.state < DocumentState.ComputedScopes) {
            console.warn(`Attempted reference resolution before document reached ComputedScopes state (${document.uri}).`);
        }
        const referenceType = this.reflection.getReferenceType(refInfo);
        return {
            ...refInfo,
            message: `Could not resolve reference to ${referenceType} named '${refInfo.reference.$refText}'.`,
            targetDescription
        };
    }

}
