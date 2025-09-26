/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstNode, AstNodeDescription } from '../syntax-tree.js';
import { CompletionItemKind, SymbolKind } from 'vscode-languageserver';
/**
 * This service consolidates the logic for gathering LSP kind information based on AST nodes or their descriptions.
 */
export interface NodeKindProvider {
    /**
     * Returns a `SymbolKind` as used by `WorkspaceSymbolProvider` or `DocumentSymbolProvider`.
     * @param node AST node or node description.
     * @returns The corresponding symbol kind.
     */
    getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind;
    /**
     * Returns a `CompletionItemKind` as used by the `CompletionProvider`.
     * @param node AST node or node description.
     * @returns The corresponding completion item kind.
     */
    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind;
}
/**
 * Default implementation of the `NodeKindProvider` interface.
 * @remarks This implementation returns `SymbolKind.Field` for all nodes and `CompletionItemKind.Reference` for all nodes. Extend this class to customize symbol and completion types your langauge.
 */
export declare class DefaultNodeKindProvider implements NodeKindProvider {
    /**
     * @remarks The default implementation returns `SymbolKind.Field` for all nodes.
     */
    getSymbolKind(_node: AstNode | AstNodeDescription): SymbolKind;
    /**
     * @remarks The default implementation returns `CompletionItemKind.Reference` for all nodes.
     */
    getCompletionItemKind(_node: AstNode | AstNodeDescription): CompletionItemKind;
}
//# sourceMappingURL=node-kind-provider.d.ts.map