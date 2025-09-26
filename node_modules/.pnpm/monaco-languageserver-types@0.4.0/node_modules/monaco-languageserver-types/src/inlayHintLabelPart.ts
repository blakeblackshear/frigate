import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromCommand, toCommand } from './command.js'
import { fromLocation, toLocation } from './location.js'
import { fromMarkdownString, toMarkdownString } from './markdownString.js'

/**
 * Convert a Monaco editor inlay hint label part to an LSP inlay hint label part.
 *
 * @param inlayHintLabelPart
 *   The Monaco inlay hint label part to convert.
 * @returns
 *   The inlay hint label part as an LSP inlay hint label part.
 */
export function fromInlayHintLabelPart(
  inlayHintLabelPart: monaco.languages.InlayHintLabelPart
): lsp.InlayHintLabelPart {
  const result: lsp.InlayHintLabelPart = {
    value: inlayHintLabelPart.label
  }

  if (inlayHintLabelPart.command) {
    result.command = fromCommand(inlayHintLabelPart.command)
  }

  if (inlayHintLabelPart.location) {
    result.location = fromLocation(inlayHintLabelPart.location)
  }

  if (typeof inlayHintLabelPart.tooltip === 'string') {
    result.tooltip = inlayHintLabelPart.tooltip
  } else if (inlayHintLabelPart.tooltip) {
    result.tooltip = fromMarkdownString(inlayHintLabelPart.tooltip)
  }

  return result
}

/**
 * Convert an LSP inlay hint label part to a Monaco editor inlay hint label part.
 *
 * @param inlayHintLabelPart
 *   The LSP inlay hint label part to convert.
 * @returns
 *   The inlay hint label part as Monaco editor inlay hint label part.
 */
export function toInlayHintLabelPart(
  inlayHintLabelPart: lsp.InlayHintLabelPart
): monaco.languages.InlayHintLabelPart {
  const result: monaco.languages.InlayHintLabelPart = {
    label: inlayHintLabelPart.value
  }

  if (inlayHintLabelPart.command) {
    result.command = toCommand(inlayHintLabelPart.command)
  }

  if (inlayHintLabelPart.location) {
    result.location = toLocation(inlayHintLabelPart.location)
  }

  if (typeof inlayHintLabelPart.tooltip === 'string') {
    result.tooltip = inlayHintLabelPart.tooltip
  } else if (inlayHintLabelPart.tooltip) {
    result.tooltip = toMarkdownString(inlayHintLabelPart.tooltip)
  }

  return result
}
