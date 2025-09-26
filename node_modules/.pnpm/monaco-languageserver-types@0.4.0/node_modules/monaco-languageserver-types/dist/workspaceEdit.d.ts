import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor workspace edit to an LSP workspace edit.
 *
 * @param workspaceEdit
 *   The Monaco workspace edit to convert.
 * @returns
 *   The workspace edit as an LSP workspace edit.
 */
export declare function fromWorkspaceEdit(workspaceEdit: monaco.languages.WorkspaceEdit): lsp.WorkspaceEdit;
/**
 * Convert an LSP workspace edit to a Monaco editor workspace edit.
 *
 * @param workspaceEdit
 *   The LSP workspace edit to convert.
 * @returns
 *   The workspace edit as Monaco editor workspace edit.
 */
export declare function toWorkspaceEdit(workspaceEdit: lsp.WorkspaceEdit): monaco.languages.WorkspaceEdit;
//# sourceMappingURL=workspaceEdit.d.ts.map