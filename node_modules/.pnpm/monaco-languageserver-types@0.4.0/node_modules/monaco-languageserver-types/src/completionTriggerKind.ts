import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor completion trigger kind to an LSP completion trigger kind.
 *
 * @param kind
 *   The Monaco completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as an LSP completion trigger kind.
 */
export function fromCompletionTriggerKind(
  kind: monaco.languages.CompletionTriggerKind
): lsp.CompletionTriggerKind {
  if (kind === (0 satisfies monaco.languages.CompletionTriggerKind.Invoke)) {
    return 1 satisfies typeof lsp.CompletionTriggerKind.Invoked
  }
  if (kind === (1 satisfies monaco.languages.CompletionTriggerKind.TriggerCharacter)) {
    return 2 satisfies typeof lsp.CompletionTriggerKind.TriggerCharacter
  }

  // Kind === TriggerForIncompleteCompletions.
  return 3
}

/**
 * Convert an LSP completion trigger kind to a Monaco editor completion trigger kind.
 *
 * @param kind
 *   The LSP completion trigger kind to convert.
 * @returns
 *   The completion trigger kind as Monaco editor completion trigger kind.
 */
export function toCompletionTriggerKind(
  kind: lsp.CompletionTriggerKind
): monaco.languages.CompletionTriggerKind {
  if (kind === (1 satisfies typeof lsp.CompletionTriggerKind.Invoked)) {
    return 0 satisfies monaco.languages.CompletionTriggerKind.Invoke
  }
  if (kind === (2 satisfies typeof lsp.CompletionTriggerKind.TriggerCharacter)) {
    return 1 satisfies monaco.languages.CompletionTriggerKind.TriggerCharacter
  }

  // Kind === 3
  return 2 satisfies monaco.languages.CompletionTriggerKind.TriggerForIncompleteCompletions
}
