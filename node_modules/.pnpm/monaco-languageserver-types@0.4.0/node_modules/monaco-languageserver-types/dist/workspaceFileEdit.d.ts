import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
type WorkspaceFileEdit = lsp.CreateFile | lsp.DeleteFile | lsp.RenameFile;
/**
 * Convert Monaco editor workspace file edit options to LSP workspace file edit options.
 *
 * @param workspaceFileEdit
 *   The Monaco workspace file edit options to convert.
 * @returns
 *   The range as LSP workspace file edit options.
 */
export declare function fromWorkspaceFileEdit(workspaceFileEdit: monaco.languages.IWorkspaceFileEdit): WorkspaceFileEdit;
/**
 * Convert an LSP workspace file edit to a Monaco editor workspace file edit.
 *
 * @param workspaceFileEdit
 *   The LSP workspace file edit to convert.
 * @returns
 *   The workspace file edit options Monaco editor workspace file edit options.
 */
export declare function toWorkspaceFileEdit(workspaceFileEdit: WorkspaceFileEdit): monaco.languages.IWorkspaceFileEdit;
export {};
//# sourceMappingURL=workspaceFileEdit.d.ts.map