/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CancellationToken, TypeHierarchyItem, TypeHierarchyPrepareParams, TypeHierarchySubtypesParams, TypeHierarchySupertypesParams } from 'vscode-languageserver';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { LangiumDocument, LangiumDocuments } from '../workspace/documents.js';
import type { MaybePromise } from '../utils/promise-utils.js';
/**
 * Language-specific service for handling type hierarchy requests.
 */
export interface TypeHierarchyProvider {
    prepareTypeHierarchy(document: LangiumDocument, params: TypeHierarchyPrepareParams, cancelToken?: CancellationToken): MaybePromise<TypeHierarchyItem[] | undefined>;
    supertypes(params: TypeHierarchySupertypesParams, cancelToken?: CancellationToken): MaybePromise<TypeHierarchyItem[] | undefined>;
    subtypes(params: TypeHierarchySubtypesParams, cancelToken?: CancellationToken): MaybePromise<TypeHierarchyItem[] | undefined>;
}
export declare abstract class AbstractTypeHierarchyProvider implements TypeHierarchyProvider {
    protected readonly grammarConfig: GrammarConfig;
    protected readonly nameProvider: NameProvider;
    protected readonly documents: LangiumDocuments;
    protected readonly references: References;
    constructor(services: LangiumServices);
    prepareTypeHierarchy(document: LangiumDocument, params: TypeHierarchyPrepareParams, _cancelToken?: CancellationToken): MaybePromise<TypeHierarchyItem[] | undefined>;
    protected getTypeHierarchyItems(targetNode: AstNode, document: LangiumDocument): TypeHierarchyItem[] | undefined;
    /**
     * Override this method to change default properties of the type hierarchy item or add additional ones like `tags`
     * or `details`.
     *
     * @example
     * // Change the node kind to SymbolKind.Interface
     * return { kind: SymbolKind.Interface }
     *
     * @see NodeKindProvider
     */
    protected getTypeHierarchyItem(_targetNode: AstNode): Partial<TypeHierarchyItem> | undefined;
    supertypes(params: TypeHierarchySupertypesParams, _cancelToken?: CancellationToken): Promise<TypeHierarchyItem[] | undefined>;
    /**
     * Override this method to collect the supertypes for your language.
     */
    protected abstract getSupertypes(node: AstNode): MaybePromise<TypeHierarchyItem[] | undefined>;
    subtypes(params: TypeHierarchySubtypesParams, _cancelToken?: CancellationToken): Promise<TypeHierarchyItem[] | undefined>;
    /**
     * Override this method to collect the subtypes for your language.
     */
    protected abstract getSubtypes(node: AstNode): MaybePromise<TypeHierarchyItem[] | undefined>;
}
//# sourceMappingURL=type-hierarchy-provider.d.ts.map