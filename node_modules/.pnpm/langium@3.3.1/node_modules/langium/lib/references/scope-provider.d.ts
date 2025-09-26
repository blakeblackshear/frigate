/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, AstReflection, ReferenceInfo } from '../syntax-tree.js';
import type { AstNodeDescriptionProvider } from '../workspace/ast-descriptions.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { NameProvider } from './name-provider.js';
import type { Scope, ScopeOptions } from './scope.js';
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
export declare class DefaultScopeProvider implements ScopeProvider {
    protected readonly reflection: AstReflection;
    protected readonly nameProvider: NameProvider;
    protected readonly descriptions: AstNodeDescriptionProvider;
    protected readonly indexManager: IndexManager;
    protected readonly globalScopeCache: WorkspaceCache<string, Scope>;
    constructor(services: LangiumCoreServices);
    getScope(context: ReferenceInfo): Scope;
    /**
     * Create a scope for the given collection of AST node descriptions.
     */
    protected createScope(elements: Iterable<AstNodeDescription>, outerScope?: Scope, options?: ScopeOptions): Scope;
    /**
     * Create a scope for the given collection of AST nodes, which need to be transformed into respective
     * descriptions first. This is done using the `NameProvider` and `AstNodeDescriptionProvider` services.
     */
    protected createScopeForNodes(elements: Iterable<AstNode>, outerScope?: Scope, options?: ScopeOptions): Scope;
    /**
     * Create a global scope filtered for the given reference type.
     */
    protected getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope;
}
//# sourceMappingURL=scope-provider.d.ts.map