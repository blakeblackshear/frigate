import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor code action trigger type to an LSP completion item kind.
 *
 * @param type
 *   The Monaco code action trigger type to convert.
 * @returns
 *   The code action trigger type as an LSP completion item kind.
 */
export function fromCodeActionTriggerType(
  type: monaco.languages.CodeActionTriggerType
): lsp.CodeActionTriggerKind {
  return type
}

/**
 * Convert an LSP completion item kind to a Monaco editor code action trigger type.
 *
 * @param kind
 *   The LSP completion item kind to convert.
 * @returns
 *   The completion item kind as Monaco editor code action trigger type.
 */
export function toCodeActionTriggerType(
  kind: lsp.CodeActionTriggerKind
): monaco.languages.CodeActionTriggerType {
  return kind
}
