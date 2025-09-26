import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromRange, toRange } from './range.js'

/**
 * Convert Monaco editor linked editing ranges to LSP linked editing ranges.
 *
 * @param linkedEditingRanges
 *   The Monaco linked editing ranges to convert.
 * @returns
 *   The linked editing ranges as LSP linked editing ranges.
 */
export function fromLinkedEditingRanges(
  linkedEditingRanges: monaco.languages.LinkedEditingRanges
): lsp.LinkedEditingRanges {
  const result: lsp.LinkedEditingRanges = {
    ranges: linkedEditingRanges.ranges.map(fromRange)
  }

  if (linkedEditingRanges.wordPattern) {
    result.wordPattern = linkedEditingRanges.wordPattern.source
  }

  return result
}

/**
 * Convert LSP linked editing ranges to Monaco editor linked editing ranges.
 *
 * @param linkedEditingRanges
 *   The LSP linked editing ranges to convert.
 * @returns
 *   The linked editing ranges Monaco editor linked editing ranges.
 */
export function toLinkedEditingRanges(
  linkedEditingRanges: lsp.LinkedEditingRanges
): monaco.languages.LinkedEditingRanges {
  const result: monaco.languages.LinkedEditingRanges = {
    ranges: linkedEditingRanges.ranges.map(toRange)
  }

  if (linkedEditingRanges.wordPattern != null) {
    result.wordPattern = new RegExp(linkedEditingRanges.wordPattern)
  }

  return result
}
