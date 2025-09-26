/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstNode } from '../../syntax-tree.js';
import type { SemanticTokenAcceptor } from '../../lsp/semantic-token-provider.js';
import { AbstractSemanticTokenProvider } from '../../lsp/semantic-token-provider.js';
export declare class LangiumGrammarSemanticTokenProvider extends AbstractSemanticTokenProvider {
    protected highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void;
}
//# sourceMappingURL=grammar-semantic-tokens.d.ts.map