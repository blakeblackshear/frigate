import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor completion item kind to an LSP completion item kind.
 *
 * @param kind
 *   The Monaco completion item kind to convert.
 * @returns
 *   The completion item kind as an LSP completion item kind.
 */
export function fromCompletionItemKind(
  kind: monaco.languages.CompletionItemKind
): lsp.CompletionItemKind | undefined {
  if (kind === (18 satisfies monaco.languages.CompletionItemKind.Text)) {
    return 1 satisfies typeof lsp.CompletionItemKind.Text
  }
  if (kind === (0 satisfies monaco.languages.CompletionItemKind.Method)) {
    return 2 satisfies typeof lsp.CompletionItemKind.Method
  }
  if (kind === (1 satisfies monaco.languages.CompletionItemKind.Function)) {
    return 3 satisfies typeof lsp.CompletionItemKind.Function
  }
  if (kind === (2 satisfies monaco.languages.CompletionItemKind.Constructor)) {
    return 4 satisfies typeof lsp.CompletionItemKind.Constructor
  }
  if (kind === (3 satisfies monaco.languages.CompletionItemKind.Field)) {
    return 5 satisfies typeof lsp.CompletionItemKind.Field
  }
  if (kind === (4 satisfies monaco.languages.CompletionItemKind.Variable)) {
    return 6 satisfies typeof lsp.CompletionItemKind.Variable
  }
  if (kind === (5 satisfies monaco.languages.CompletionItemKind.Class)) {
    return 7 satisfies typeof lsp.CompletionItemKind.Class
  }
  if (kind === (7 satisfies monaco.languages.CompletionItemKind.Interface)) {
    return 8 satisfies typeof lsp.CompletionItemKind.Interface
  }
  if (kind === (8 satisfies monaco.languages.CompletionItemKind.Module)) {
    return 9 satisfies typeof lsp.CompletionItemKind.Module
  }
  if (kind === (9 satisfies monaco.languages.CompletionItemKind.Property)) {
    return 10 satisfies typeof lsp.CompletionItemKind.Property
  }
  if (kind === (12 satisfies monaco.languages.CompletionItemKind.Unit)) {
    return 11 satisfies typeof lsp.CompletionItemKind.Unit
  }
  if (kind === (13 satisfies monaco.languages.CompletionItemKind.Value)) {
    return 12 satisfies typeof lsp.CompletionItemKind.Value
  }
  if (kind === (15 satisfies monaco.languages.CompletionItemKind.Enum)) {
    return 13 satisfies typeof lsp.CompletionItemKind.Enum
  }
  if (kind === (17 satisfies monaco.languages.CompletionItemKind.Keyword)) {
    return 14 satisfies typeof lsp.CompletionItemKind.Keyword
  }
  if (kind === (27 satisfies monaco.languages.CompletionItemKind.Snippet)) {
    return 15 satisfies typeof lsp.CompletionItemKind.Snippet
  }
  if (kind === (19 satisfies monaco.languages.CompletionItemKind.Color)) {
    return 16 satisfies typeof lsp.CompletionItemKind.Color
  }
  if (kind === (20 satisfies monaco.languages.CompletionItemKind.File)) {
    return 17 satisfies typeof lsp.CompletionItemKind.File
  }
  if (kind === (21 satisfies monaco.languages.CompletionItemKind.Reference)) {
    return 18 satisfies typeof lsp.CompletionItemKind.Reference
  }
  if (kind === (23 satisfies monaco.languages.CompletionItemKind.Folder)) {
    return 19 satisfies typeof lsp.CompletionItemKind.Folder
  }
  if (kind === (16 satisfies monaco.languages.CompletionItemKind.EnumMember)) {
    return 20 satisfies typeof lsp.CompletionItemKind.EnumMember
  }
  if (kind === (14 satisfies monaco.languages.CompletionItemKind.Constant)) {
    return 21 satisfies typeof lsp.CompletionItemKind.Constant
  }
  if (kind === (6 satisfies monaco.languages.CompletionItemKind.Struct)) {
    return 22 satisfies typeof lsp.CompletionItemKind.Struct
  }
  if (kind === (10 satisfies monaco.languages.CompletionItemKind.Event)) {
    return 23 satisfies typeof lsp.CompletionItemKind.Event
  }
  if (kind === (11 satisfies monaco.languages.CompletionItemKind.Operator)) {
    return 24 satisfies typeof lsp.CompletionItemKind.Operator
  }
  if (kind === (24 satisfies monaco.languages.CompletionItemKind.TypeParameter)) {
    return 25 satisfies typeof lsp.CompletionItemKind.TypeParameter
  }
}

/**
 * Convert an LSP completion item kind to a Monaco editor completion item kind.
 *
 * @param kind
 *   The LSP completion item kind to convert.
 * @returns
 *   The completion item kind as Monaco editor completion item kind.
 */
export function toCompletionItemKind(
  kind: lsp.CompletionItemKind
): monaco.languages.CompletionItemKind {
  if (kind === (1 satisfies typeof lsp.CompletionItemKind.Text)) {
    return 18 satisfies monaco.languages.CompletionItemKind.Text
  }
  if (kind === (2 satisfies typeof lsp.CompletionItemKind.Method)) {
    return 0 satisfies monaco.languages.CompletionItemKind.Method
  }
  if (kind === (3 satisfies typeof lsp.CompletionItemKind.Function)) {
    return 1 satisfies monaco.languages.CompletionItemKind.Function
  }
  if (kind === (4 satisfies typeof lsp.CompletionItemKind.Constructor)) {
    return 2 satisfies monaco.languages.CompletionItemKind.Constructor
  }
  if (kind === (5 satisfies typeof lsp.CompletionItemKind.Field)) {
    return 3 satisfies monaco.languages.CompletionItemKind.Field
  }
  if (kind === (6 satisfies typeof lsp.CompletionItemKind.Variable)) {
    return 4 satisfies monaco.languages.CompletionItemKind.Variable
  }
  if (kind === (7 satisfies typeof lsp.CompletionItemKind.Class)) {
    return 5 satisfies monaco.languages.CompletionItemKind.Class
  }
  if (kind === (8 satisfies typeof lsp.CompletionItemKind.Interface)) {
    return 7 satisfies monaco.languages.CompletionItemKind.Interface
  }
  if (kind === (9 satisfies typeof lsp.CompletionItemKind.Module)) {
    return 8 satisfies monaco.languages.CompletionItemKind.Module
  }
  if (kind === (10 satisfies typeof lsp.CompletionItemKind.Property)) {
    return 9 satisfies monaco.languages.CompletionItemKind.Property
  }
  if (kind === (11 satisfies typeof lsp.CompletionItemKind.Unit)) {
    return 12 satisfies monaco.languages.CompletionItemKind.Unit
  }
  if (kind === (12 satisfies typeof lsp.CompletionItemKind.Value)) {
    return 13 satisfies monaco.languages.CompletionItemKind.Value
  }
  if (kind === (13 satisfies typeof lsp.CompletionItemKind.Enum)) {
    return 15 satisfies monaco.languages.CompletionItemKind.Enum
  }
  if (kind === (14 satisfies typeof lsp.CompletionItemKind.Keyword)) {
    return 17 satisfies monaco.languages.CompletionItemKind.Keyword
  }
  if (kind === (15 satisfies typeof lsp.CompletionItemKind.Snippet)) {
    return 27 satisfies monaco.languages.CompletionItemKind.Snippet
  }
  if (kind === (16 satisfies typeof lsp.CompletionItemKind.Color)) {
    return 19 satisfies monaco.languages.CompletionItemKind.Color
  }
  if (kind === (17 satisfies typeof lsp.CompletionItemKind.File)) {
    return 20 satisfies monaco.languages.CompletionItemKind.File
  }
  if (kind === (18 satisfies typeof lsp.CompletionItemKind.Reference)) {
    return 21 satisfies monaco.languages.CompletionItemKind.Reference
  }
  if (kind === (19 satisfies typeof lsp.CompletionItemKind.Folder)) {
    return 23 satisfies monaco.languages.CompletionItemKind.Folder
  }
  if (kind === (20 satisfies typeof lsp.CompletionItemKind.EnumMember)) {
    return 16 satisfies monaco.languages.CompletionItemKind.EnumMember
  }
  if (kind === (21 satisfies typeof lsp.CompletionItemKind.Constant)) {
    return 14 satisfies monaco.languages.CompletionItemKind.Constant
  }
  if (kind === (22 satisfies typeof lsp.CompletionItemKind.Struct)) {
    return 6 satisfies monaco.languages.CompletionItemKind.Struct
  }
  if (kind === (23 satisfies typeof lsp.CompletionItemKind.Event)) {
    return 10 satisfies monaco.languages.CompletionItemKind.Event
  }
  if (kind === (24 satisfies typeof lsp.CompletionItemKind.Operator)) {
    return 11 satisfies monaco.languages.CompletionItemKind.Operator
  }

  // Kind === 25
  return 24 satisfies monaco.languages.CompletionItemKind.TypeParameter
}
