/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CompletionItemKind, SymbolKind } from 'vscode-languageserver';
/**
 * Default implementation of the `NodeKindProvider` interface.
 * @remarks This implementation returns `SymbolKind.Field` for all nodes and `CompletionItemKind.Reference` for all nodes. Extend this class to customize symbol and completion types your langauge.
 */
export class DefaultNodeKindProvider {
    /**
     * @remarks The default implementation returns `SymbolKind.Field` for all nodes.
     */
    getSymbolKind(_node) {
        return SymbolKind.Field;
    }
    /**
     * @remarks The default implementation returns `CompletionItemKind.Reference` for all nodes.
     */
    getCompletionItemKind(_node) {
        return CompletionItemKind.Reference;
    }
}
//# sourceMappingURL=node-kind-provider.js.map