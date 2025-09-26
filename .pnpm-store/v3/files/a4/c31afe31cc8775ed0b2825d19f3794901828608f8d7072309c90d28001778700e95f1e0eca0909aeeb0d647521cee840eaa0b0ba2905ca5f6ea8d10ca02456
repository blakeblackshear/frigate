/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription } from '../syntax-tree.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { CommentProvider } from './comment-provider.js';
import type { JSDocTag } from './jsdoc.js';
/**
 * Provides documentation for AST nodes.
 */
export interface DocumentationProvider {
    /**
     * Returns a markdown documentation string for the specified AST node.
     *
     * The default implementation `JSDocDocumentationProvider` will inspect the comment associated with the specified node.
     */
    getDocumentation(node: AstNode): string | undefined;
}
export declare class JSDocDocumentationProvider implements DocumentationProvider {
    protected readonly indexManager: IndexManager;
    protected readonly commentProvider: CommentProvider;
    constructor(services: LangiumCoreServices);
    getDocumentation(node: AstNode): string | undefined;
    protected documentationLinkRenderer(node: AstNode, name: string, display: string): string | undefined;
    protected documentationTagRenderer(_node: AstNode, _tag: JSDocTag): string | undefined;
    protected findNameInPrecomputedScopes(node: AstNode, name: string): AstNodeDescription | undefined;
    protected findNameInGlobalScope(node: AstNode, name: string): AstNodeDescription | undefined;
}
//# sourceMappingURL=documentation-provider.d.ts.map