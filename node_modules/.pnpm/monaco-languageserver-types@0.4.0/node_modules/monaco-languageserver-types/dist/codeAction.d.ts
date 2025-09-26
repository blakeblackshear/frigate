import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor code action to an LSP code action.
 *
 * @param codeAction
 *   The Monaco code action to convert.
 * @returns
 *   The code action as an LSP code action.
 */
export declare function fromCodeAction(codeAction: monaco.languages.CodeAction): lsp.CodeAction;
/**
 * Convert an LSP code action to a Monaco editor code action.
 *
 * @param codeAction
 *   The LSP code action to convert.
 * @returns
 *   The code action as Monaco editor code action.
 */
export declare function toCodeAction(codeAction: lsp.CodeAction): monaco.languages.CodeAction;
//# sourceMappingURL=codeAction.d.ts.map