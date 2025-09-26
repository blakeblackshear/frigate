import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromMarkdownString, toMarkdownString } from './markdownString.js'
import { fromParameterInformation, toParameterInformation } from './parameterInformation.js'

/**
 * Convert a Monaco editor signature information to an LSP signature information.
 *
 * @param signatureInformation
 *   The Monaco signature information to convert.
 * @returns
 *   The signature information as an LSP signature information.
 */
export function fromSignatureInformation(
  signatureInformation: monaco.languages.SignatureInformation
): lsp.SignatureInformation {
  const result: lsp.SignatureInformation = {
    label: signatureInformation.label,
    parameters: signatureInformation.parameters.map(fromParameterInformation)
  }

  if (typeof signatureInformation.documentation === 'string') {
    result.documentation = signatureInformation.documentation
  } else if (signatureInformation.documentation) {
    result.documentation = fromMarkdownString(signatureInformation.documentation)
  }

  if (signatureInformation.activeParameter != null) {
    result.activeParameter = signatureInformation.activeParameter
  }

  return result
}

/**
 * Convert an LSP signature information to a Monaco editor signature information.
 *
 * @param signatureInformation
 *   The LSP signature information to convert.
 * @returns
 *   The signature information as Monaco editor signature information.
 */
export function toSignatureInformation(
  signatureInformation: lsp.SignatureInformation
): monaco.languages.SignatureInformation {
  const result: monaco.languages.SignatureInformation = {
    label: signatureInformation.label,
    parameters: signatureInformation.parameters?.map(toParameterInformation) ?? []
  }

  if (typeof signatureInformation.documentation === 'string') {
    result.documentation = signatureInformation.documentation
  } else if (signatureInformation.documentation) {
    result.documentation = toMarkdownString(signatureInformation.documentation)
  }

  if (signatureInformation.activeParameter != null) {
    result.activeParameter = signatureInformation.activeParameter
  }

  return result
}
