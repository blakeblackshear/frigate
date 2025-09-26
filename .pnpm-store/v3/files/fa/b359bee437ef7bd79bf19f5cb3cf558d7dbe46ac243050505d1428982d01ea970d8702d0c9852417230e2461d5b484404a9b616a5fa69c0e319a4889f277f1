/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { streamAllContents, streamContents } from '../utils/ast-utils.js';
import { MultiMap } from '../utils/collections.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
/**
 * The default scope computation creates and collectes descriptions of the AST nodes to be exported into the
 * _global_ scope from the given document. By default those are the document's root AST node and its directly
 * contained child nodes.
 *
 * Besides, it gathers all AST nodes that have a name (according to the `NameProvider` service) and includes them
 * in the local scope of their particular container nodes. As a result, for every cross-reference in the AST,
 * target elements from the same level (siblings) and further up towards the root (parents and siblings of parents)
 * are visible. Elements being nested inside lower levels (children, children of siblings and parents' siblings)
 * are _invisible_ by default, but that can be changed by customizing this service.
 */
export class DefaultScopeComputation {
    constructor(services) {
        this.nameProvider = services.references.NameProvider;
        this.descriptions = services.workspace.AstNodeDescriptionProvider;
    }
    async computeExports(document, cancelToken = CancellationToken.None) {
        return this.computeExportsForNode(document.parseResult.value, document, undefined, cancelToken);
    }
    /**
     * Creates {@link AstNodeDescription AstNodeDescriptions} for the given {@link AstNode parentNode} and its children.
     * The list of children to be considered is determined by the function parameter {@link children}.
     * By default only the direct children of {@link parentNode} are visited, nested nodes are not exported.
     *
     * @param parentNode AST node to be exported, i.e., of which an {@link AstNodeDescription} shall be added to the returned list.
     * @param document The document containing the AST node to be exported.
     * @param children A function called with {@link parentNode} as single argument and returning an {@link Iterable} supplying the children to be visited, which must be directly or transitively contained in {@link parentNode}.
     * @param cancelToken Indicates when to cancel the current operation.
     * @throws `OperationCancelled` if a user action occurs during execution.
     * @returns A list of {@link AstNodeDescription AstNodeDescriptions} to be published to index.
     */
    async computeExportsForNode(parentNode, document, children = streamContents, cancelToken = CancellationToken.None) {
        const exports = [];
        this.exportNode(parentNode, exports, document);
        for (const node of children(parentNode)) {
            await interruptAndCheck(cancelToken);
            this.exportNode(node, exports, document);
        }
        return exports;
    }
    /**
     * Add a single node to the list of exports if it has a name. Override this method to change how
     * symbols are exported, e.g. by modifying their exported name.
     */
    exportNode(node, exports, document) {
        const name = this.nameProvider.getName(node);
        if (name) {
            exports.push(this.descriptions.createDescription(node, name, document));
        }
    }
    async computeLocalScopes(document, cancelToken = CancellationToken.None) {
        const rootNode = document.parseResult.value;
        const scopes = new MultiMap();
        // Here we navigate the full AST - local scopes shall be available in the whole document
        for (const node of streamAllContents(rootNode)) {
            await interruptAndCheck(cancelToken);
            this.processNode(node, document, scopes);
        }
        return scopes;
    }
    /**
     * Process a single node during scopes computation. The default implementation makes the node visible
     * in the subtree of its container (if the node has a name). Override this method to change this,
     * e.g. by increasing the visibility to a higher level in the AST.
     */
    processNode(node, document, scopes) {
        const container = node.$container;
        if (container) {
            const name = this.nameProvider.getName(node);
            if (name) {
                scopes.add(container, this.descriptions.createDescription(node, name, document));
            }
        }
    }
}
//# sourceMappingURL=scope-computation.js.map