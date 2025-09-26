import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
type LSPFileEditOptions = lsp.CreateFileOptions & lsp.DeleteFileOptions & lsp.RenameFileOptions;
/**
 * Convert Monaco editor workspace file edit options to LSP workspace file edit options.
 *
 * @param options
 *   The Monaco workspace file edit options to convert.
 * @returns
 *   The range as LSP workspace file edit options.
 */
export declare function fromWorkspaceFileEditOptions(options: monaco.languages.WorkspaceFileEditOptions): LSPFileEditOptions;
/**
 * Convert LSP workspace file edit options to Monaco editor workspace file edit options.
 *
 * @param options
 *   The LSP workspace file edit options to convert.
 * @returns
 *   The workspace file edit options Monaco editor workspace file edit options.
 */
export declare function toWorkspaceFileEditOptions(options: LSPFileEditOptions): monaco.languages.WorkspaceFileEditOptions;
export {};
//# sourceMappingURL=workspaceFileEditOptions.d.ts.map