import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromSignatureInformation, toSignatureInformation } from './signatureInformation.js'

/**
 * Convert a Monaco editor signature help to an LSP signature help.
 *
 * @param signatureHelp
 *   The Monaco signature help to convert.
 * @returns
 *   The signature help as an LSP signature help.
 */
export function fromSignatureHelp(
  signatureHelp: monaco.languages.SignatureHelp
): lsp.SignatureHelp {
  return {
    activeParameter: signatureHelp.activeParameter,
    activeSignature: signatureHelp.activeSignature,
    signatures: signatureHelp.signatures.map(fromSignatureInformation)
  }
}

/**
 * Convert an LSP signature help to a Monaco editor signature help.
 *
 * @param signatureHelp
 *   The LSP signature help to convert.
 * @returns
 *   The signature help as Monaco editor signature help.
 */
export function toSignatureHelp(signatureHelp: lsp.SignatureHelp): monaco.languages.SignatureHelp {
  return {
    activeParameter: signatureHelp.activeParameter ?? 0,
    activeSignature: signatureHelp.activeSignature ?? 0,
    signatures: signatureHelp.signatures.map(toSignatureInformation)
  }
}
