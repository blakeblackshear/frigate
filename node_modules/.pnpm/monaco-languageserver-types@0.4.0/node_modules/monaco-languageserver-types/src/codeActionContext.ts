import type * as monaco from 'monaco-types'
import { type Writable } from 'type-fest'
import type * as lsp from 'vscode-languageserver-protocol'

import { fromCodeActionTriggerType } from './codeActionTriggerType.js'
import { fromMarkerData, toMarkerData } from './markerData.js'

/**
 * Convert a Monaco editor code action context to an LSP code action context.
 *
 * @param codeActionContext
 *   The Monaco code action context to convert.
 * @returns
 *   The code action context as an LSP code action context.
 */
export function fromCodeActionContext(
  codeActionContext: monaco.languages.CodeActionContext
): lsp.CodeActionContext {
  const result: lsp.CodeActionContext = {
    diagnostics: codeActionContext.markers.map(fromMarkerData),
    triggerKind: fromCodeActionTriggerType(codeActionContext.trigger)
  }

  if (codeActionContext.only != null) {
    result.only = [codeActionContext.only]
  }

  return result
}

/**
 * Convert an LSP code action context to a Monaco editor code action context.
 *
 * @param codeActionContext
 *   The LSP code action context to convert.
 * @returns
 *   The code action context as Monaco editor code action context.
 */
export function toCodeActionContext(
  codeActionContext: lsp.CodeActionContext
): monaco.languages.CodeActionContext {
  const result: Writable<monaco.languages.CodeActionContext> = {
    markers: codeActionContext.diagnostics.map(toMarkerData),
    trigger: fromCodeActionTriggerType(
      codeActionContext.triggerKind ?? (2 satisfies monaco.languages.CodeActionTriggerType.Auto)
    )
  }

  if (codeActionContext.only?.[0]) {
    result.only = codeActionContext.only[0]
  }

  return result
}
