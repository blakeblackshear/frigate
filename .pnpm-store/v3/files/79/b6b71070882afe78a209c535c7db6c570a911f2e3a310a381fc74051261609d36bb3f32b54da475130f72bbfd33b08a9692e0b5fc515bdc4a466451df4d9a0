/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { isAstNode, isAstNodeDescription, isLinkingError } from '../syntax-tree.js';
import { findRootNode, streamAst, streamReferences } from '../utils/ast-utils.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
import { DocumentState } from '../workspace/documents.js';
const ref_resolving = Symbol('ref_resolving');
export class DefaultLinker {
    constructor(services) {
        this.reflection = services.shared.AstReflection;
        this.langiumDocuments = () => services.shared.workspace.LangiumDocuments;
        this.scopeProvider = services.references.ScopeProvider;
        this.astNodeLocator = services.workspace.AstNodeLocator;
    }
    async link(document, cancelToken = CancellationToken.None) {
        for (const node of streamAst(document.parseResult.value)) {
            await interruptAndCheck(cancelToken);
            streamReferences(node).forEach(ref => this.doLink(ref, document));
        }
    }
    doLink(refInfo, document) {
        var _a;
        const ref = refInfo.reference;
        // The reference may already have been resolved lazily by accessing its `ref` property.
        if (ref._ref === undefined) {
            ref._ref = ref_resolving;
            try {
                const description = this.getCandidate(refInfo);
                if (isLinkingError(description)) {
                    ref._ref = description;
                }
                else {
                    ref._nodeDescription = description;
                    if (this.langiumDocuments().hasDocument(description.documentUri)) {
                        // The target document is already loaded
                        const linkedNode = this.loadAstNode(description);
                        ref._ref = linkedNode !== null && linkedNode !== void 0 ? linkedNode : this.createLinkingError(refInfo, description);
                    }
                    else {
                        // Try to load the target AST node later using the already provided description
                        ref._ref = undefined;
                    }
                }
            }
            catch (err) {
                console.error(`An error occurred while resolving reference to '${ref.$refText}':`, err);
                const errorMessage = (_a = err.message) !== null && _a !== void 0 ? _a : String(err);
                ref._ref = Object.assign(Object.assign({}, refInfo), { message: `An error occurred while resolving reference to '${ref.$refText}': ${errorMessage}` });
            }
            // Add the reference to the document's array of references
            // Only add if the reference has been not been resolved earlier
            // Otherwise we end up with duplicates
            // See also implementation of `buildReference`
            document.references.push(ref);
        }
    }
    unlink(document) {
        for (const ref of document.references) {
            delete ref._ref;
            delete ref._nodeDescription;
        }
        document.references = [];
    }
    getCandidate(refInfo) {
        const scope = this.scopeProvider.getScope(refInfo);
        const description = scope.getElement(refInfo.reference.$refText);
        return description !== null && description !== void 0 ? description : this.createLinkingError(refInfo);
    }
    buildReference(node, property, refNode, refText) {
        // See behavior description in doc of Linker, update that on changes in here.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const linker = this;
        const reference = {
            $refNode: refNode,
            $refText: refText,
            get ref() {
                var _a;
                if (isAstNode(this._ref)) {
                    // Most frequent case: the target is already resolved.
                    return this._ref;
                }
                else if (isAstNodeDescription(this._nodeDescription)) {
                    // A candidate has been found before, but it is not loaded yet.
                    const linkedNode = linker.loadAstNode(this._nodeDescription);
                    this._ref = linkedNode !== null && linkedNode !== void 0 ? linkedNode : linker.createLinkingError({ reference, container: node, property }, this._nodeDescription);
                }
                else if (this._ref === undefined) {
                    // The reference has not been linked yet, so do that now.
                    this._ref = ref_resolving;
                    const document = findRootNode(node).$document;
                    const refData = linker.getLinkedNode({ reference, container: node, property });
                    if (refData.error && document && document.state < DocumentState.ComputedScopes) {
                        // Document scope is not ready, don't set `this._ref` so linker can retry later.
                        return this._ref = undefined;
                    }
                    this._ref = (_a = refData.node) !== null && _a !== void 0 ? _a : refData.error;
                    this._nodeDescription = refData.descr;
                    document === null || document === void 0 ? void 0 : document.references.push(this);
                }
                else if (this._ref === ref_resolving) {
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
    getLinkedNode(refInfo) {
        var _a;
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
                    error: this.createLinkingError(refInfo, description)
                };
            }
        }
        catch (err) {
            console.error(`An error occurred while resolving reference to '${refInfo.reference.$refText}':`, err);
            const errorMessage = (_a = err.message) !== null && _a !== void 0 ? _a : String(err);
            return {
                error: Object.assign(Object.assign({}, refInfo), { message: `An error occurred while resolving reference to '${refInfo.reference.$refText}': ${errorMessage}` })
            };
        }
    }
    loadAstNode(nodeDescription) {
        if (nodeDescription.node) {
            return nodeDescription.node;
        }
        const doc = this.langiumDocuments().getDocument(nodeDescription.documentUri);
        if (!doc) {
            return undefined;
        }
        return this.astNodeLocator.getAstNode(doc.parseResult.value, nodeDescription.path);
    }
    createLinkingError(refInfo, targetDescription) {
        // Check whether the document is sufficiently processed by the DocumentBuilder. If not, this is a hint for a bug
        // in the language implementation.
        const document = findRootNode(refInfo.container).$document;
        if (document && document.state < DocumentState.ComputedScopes) {
            console.warn(`Attempted reference resolution before document reached ComputedScopes state (${document.uri}).`);
        }
        const referenceType = this.reflection.getReferenceType(refInfo);
        return Object.assign(Object.assign({}, refInfo), { message: `Could not resolve reference to ${referenceType} named '${refInfo.reference.$refText}'.`, targetDescription });
    }
}
//# sourceMappingURL=linker.js.map