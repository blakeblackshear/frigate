import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert Monaco editor semantic tokens to LSP semantic tokens.
 *
 * @param semanticTokens
 *   The Monaco semantic tokens to convert.
 * @returns
 *   The semantic tokens as LSP semantic tokens.
 */
export declare function fromSemanticTokens(semanticTokens: monaco.languages.SemanticTokens): lsp.SemanticTokens;
/**
 * Convert LSP semantic tokens to Monaco editor semantic tokens.
 *
 * @param semanticTokens
 *   The LSP semantic tokens to convert.
 * @returns
 *   The semantic tokens as Monaco editor semantic tokens.
 */
export declare function toSemanticTokens(semanticTokens: lsp.SemanticTokens): monaco.languages.SemanticTokens;
//# sourceMappingURL=semanticTokens.d.ts.map