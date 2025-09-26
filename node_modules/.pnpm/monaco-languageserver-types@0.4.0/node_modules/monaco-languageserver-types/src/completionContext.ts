import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromCompletionTriggerKind, toCompletionTriggerKind } from './completionTriggerKind.js'

/**
 * Convert a Monaco editor completion context to an LSP completion context.
 *
 * @param completionContext
 *   The Monaco completion context to convert.
 * @returns
 *   The completion context as an LSP completion context.
 */
export function fromCompletionContext(
  completionContext: monaco.languages.CompletionContext
): lsp.CompletionContext {
  const result: lsp.CompletionContext = {
    triggerKind: fromCompletionTriggerKind(completionContext.triggerKind)
  }

  if (completionContext.triggerCharacter != null) {
    result.triggerCharacter = completionContext.triggerCharacter
  }

  return result
}

/**
 * Convert an LSP completion context to a Monaco editor completion context.
 *
 * @param completionContext
 *   The LSP completion context to convert.
 * @returns
 *   The completion context as Monaco editor completion context.
 */
export function toCompletionContext(
  completionContext: lsp.CompletionContext
): monaco.languages.CompletionContext {
  const result: monaco.languages.CompletionContext = {
    triggerKind: toCompletionTriggerKind(completionContext.triggerKind)
  }

  if (completionContext.triggerCharacter != null) {
    result.triggerCharacter = completionContext.triggerCharacter
  }

  return result
}
