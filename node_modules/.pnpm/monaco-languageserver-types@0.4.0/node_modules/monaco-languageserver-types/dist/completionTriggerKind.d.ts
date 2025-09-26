import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor completion trigger kind to an LSP completion trigger kind.
 *
 * @param kind
 *   The Monaco completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as an LSP completion trigger kind.
 */
export declare function fromCompletionTriggerKind(kind: monaco.languages.CompletionTriggerKind): lsp.CompletionTriggerKind;
/**
 * Convert an LSP completion trigger kind to a Monaco editor completion trigger kind.
 *
 * @param kind
 *   The LSP completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as Monaco editor completion trigger kind.
 */
export declare function toCompletionTriggerKind(kind: lsp.CompletionTriggerKind): monaco.languages.CompletionTriggerKind;
//# sourceMappingURL=completionTriggerKind.d.ts.map