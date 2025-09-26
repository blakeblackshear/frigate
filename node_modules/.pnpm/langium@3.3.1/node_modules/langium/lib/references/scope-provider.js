/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { MapScope, StreamScope } from './scope.js';
import { getDocument } from '../utils/ast-utils.js';
import { stream } from '../utils/stream.js';
import { WorkspaceCache } from '../utils/caching.js';
export class DefaultScopeProvider {
    constructor(services) {
        this.reflection = services.shared.AstReflection;
        this.nameProvider = services.references.NameProvider;
        this.descriptions = services.workspace.AstNodeDescriptionProvider;
        this.indexManager = services.shared.workspace.IndexManager;
        this.globalScopeCache = new WorkspaceCache(services.shared);
    }
    getScope(context) {
        const scopes = [];
        const referenceType = this.reflection.getReferenceType(context);
        const precomputed = getDocument(context.container).precomputedScopes;
        if (precomputed) {
            let currentNode = context.container;
            do {
                const allDescriptions = precomputed.get(currentNode);
                if (allDescriptions.length > 0) {
                    scopes.push(stream(allDescriptions).filter(desc => this.reflection.isSubtype(desc.type, referenceType)));
                }
                currentNode = currentNode.$container;
            } while (currentNode);
        }
        let result = this.getGlobalScope(referenceType, context);
        for (let i = scopes.length - 1; i >= 0; i--) {
            result = this.createScope(scopes[i], result);
        }
        return result;
    }
    /**
     * Create a scope for the given collection of AST node descriptions.
     */
    createScope(elements, outerScope, options) {
        return new StreamScope(stream(elements), outerScope, options);
    }
    /**
     * Create a scope for the given collection of AST nodes, which need to be transformed into respective
     * descriptions first. This is done using the `NameProvider` and `AstNodeDescriptionProvider` services.
     */
    createScopeForNodes(elements, outerScope, options) {
        const s = stream(elements).map(e => {
            const name = this.nameProvider.getName(e);
            if (name) {
                return this.descriptions.createDescription(e, name);
            }
            return undefined;
        }).nonNullable();
        return new StreamScope(s, outerScope, options);
    }
    /**
     * Create a global scope filtered for the given reference type.
     */
    getGlobalScope(referenceType, _context) {
        return this.globalScopeCache.get(referenceType, () => new MapScope(this.indexManager.allElements(referenceType)));
    }
}
//# sourceMappingURL=scope-provider.js.map