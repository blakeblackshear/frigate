import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromCompletionItem, toCompletionItem } from './completionItem.js'

/**
 * Convert a Monaco editor completion list to an LSP completion list.
 *
 * @param completionList
 *   The Monaco completion list to convert.
 * @returns
 *   The completion list as an LSP completion list.
 */
export function fromCompletionList(
  completionList: monaco.languages.CompletionList
): lsp.CompletionList {
  return {
    isIncomplete: Boolean(completionList.incomplete),
    items: completionList.suggestions.map(fromCompletionItem)
  }
}

interface ToCompletionListOptions {
  /**
   * A fallback range to use in case a completion item doesn’t provide one.
   */
  range: monaco.IRange
}

/**
 * Convert an LSP completion list to a Monaco editor completion list.
 *
 * @param completionList
 *   The LSP completion list to convert.
 * @param options
 *   Additional options needed to construct the Monaco completion list.
 * @returns
 *   The completion list as Monaco editor completion list.
 */
export function toCompletionList(
  completionList: lsp.CompletionList,
  options: ToCompletionListOptions
): monaco.languages.CompletionList {
  return {
    incomplete: Boolean(completionList.isIncomplete),
    suggestions: completionList.items.map((item) =>
      toCompletionItem(item, { range: options.range, itemDefaults: completionList.itemDefaults })
    )
  }
}
