/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, AstReflection, ReferenceInfo } from '../syntax-tree.js';
import type { Stream } from '../utils/stream.js';
import type { AstNodeDescriptionProvider } from '../workspace/ast-descriptions.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { NameProvider } from './name-provider.js';
import type { Scope, ScopeOptions} from './scope.js';
import { MapScope, StreamScope } from './scope.js';
import { getDocument } from '../utils/ast-utils.js';
import { stream } from '../utils/stream.js';
import { WorkspaceCache } from '../utils/caching.js';

/**
 * Language-specific service for determining the scope of target elements visible in a specific cross-reference context.
 */
export interface ScopeProvider {

    /**
     * Return a scope describing what elements are visible for the given AST node and cross-reference
     * identifier.
     *
     * @param context Information about the reference for which a scope is requested.
     */
    getScope(context: ReferenceInfo): Scope;

}

export class DefaultScopeProvider implements ScopeProvider {

    protected readonly reflection: AstReflection;
    protected readonly nameProvider: NameProvider;
    protected readonly descriptions: AstNodeDescriptionProvider;
    protected readonly indexManager: IndexManager;

    protected readonly globalScopeCache: WorkspaceCache<string, Scope>;

    constructor(services: LangiumCoreServices) {
        this.reflection = services.shared.AstReflection;
        this.nameProvider = services.references.NameProvider;
        this.descriptions = services.workspace.AstNodeDescriptionProvider;
        this.indexManager = services.shared.workspace.IndexManager;
        this.globalScopeCache = new WorkspaceCache<string, Scope>(services.shared);
    }

    getScope(context: ReferenceInfo): Scope {
        const scopes: Array<Stream<AstNodeDescription>> = [];
        const referenceType = this.reflection.getReferenceType(context);

        const precomputed = getDocument(context.container).precomputedScopes;
        if (precomputed) {
            let currentNode: AstNode | undefined = context.container;
            do {
                const allDescriptions = precomputed.get(currentNode);
                if (allDescriptions.length > 0) {
                    scopes.push(stream(allDescriptions).filter(
                        desc => this.reflection.isSubtype(desc.type, referenceType)));
                }
                currentNode = currentNode.$container;
            } while (currentNode);
        }

        let result: Scope = this.getGlobalScope(referenceType, context);
        for (let i = scopes.length - 1; i >= 0; i--) {
            result = this.createScope(scopes[i], result);
        }
        return result;
    }

    /**
     * Create a scope for the given collection of AST node descriptions.
     */
    protected createScope(elements: Iterable<AstNodeDescription>, outerScope?: Scope, options?: ScopeOptions): Scope {
        return new StreamScope(stream(elements), outerScope, options);
    }

    /**
     * Create a scope for the given collection of AST nodes, which need to be transformed into respective
     * descriptions first. This is done using the `NameProvider` and `AstNodeDescriptionProvider` services.
     */
    protected createScopeForNodes(elements: Iterable<AstNode>, outerScope?: Scope, options?: ScopeOptions): Scope {
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
    protected getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {
        return this.globalScopeCache.get(referenceType, () => new MapScope(this.indexManager.allElements(referenceType)));
    }

}
