import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

type LSPFileEditOptions = lsp.CreateFileOptions & lsp.DeleteFileOptions & lsp.RenameFileOptions

/**
 * Convert Monaco editor workspace file edit options to LSP workspace file edit options.
 *
 * @param options
 *   The Monaco workspace file edit options to convert.
 * @returns
 *   The range as LSP workspace file edit options.
 */
export function fromWorkspaceFileEditOptions(
  options: monaco.languages.WorkspaceFileEditOptions
): LSPFileEditOptions {
  const result: LSPFileEditOptions = {}

  if (options.ignoreIfExists != null) {
    result.ignoreIfExists = options.ignoreIfExists
  }
  if (options.ignoreIfNotExists != null) {
    result.ignoreIfNotExists = options.ignoreIfNotExists
  }
  if (options.overwrite != null) {
    result.overwrite = options.overwrite
  }
  if (options.recursive != null) {
    result.recursive = options.recursive
  }

  return result
}

/**
 * Convert LSP workspace file edit options to Monaco editor workspace file edit options.
 *
 * @param options
 *   The LSP workspace file edit options to convert.
 * @returns
 *   The workspace file edit options Monaco editor workspace file edit options.
 */
export function toWorkspaceFileEditOptions(
  options: LSPFileEditOptions
): monaco.languages.WorkspaceFileEditOptions {
  const result: monaco.languages.WorkspaceFileEditOptions = {}

  if (options.ignoreIfExists != null) {
    result.ignoreIfExists = options.ignoreIfExists
  }
  if (options.ignoreIfNotExists != null) {
    result.ignoreIfNotExists = options.ignoreIfNotExists
  }
  if (options.overwrite != null) {
    result.overwrite = options.overwrite
  }
  if (options.recursive != null) {
    result.recursive = options.recursive
  }

  return result
}
