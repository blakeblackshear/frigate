import { initialize } from 'monaco-worker-manager/worker'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  type CodeAction,
  type CodeActionContext,
  type CompletionList,
  type Diagnostic,
  type DocumentLink,
  type DocumentSymbol,
  type FoldingRange,
  type FormattingOptions,
  type Hover,
  type LocationLink,
  type Position,
  type Range,
  type SelectionRange,
  type TextEdit
} from 'vscode-languageserver-types'
import { type Telemetry } from 'yaml-language-server/lib/esm/languageservice/telemetry.js'
import {
  getLanguageService,
  type WorkspaceContextService
} from 'yaml-language-server/lib/esm/languageservice/yamlLanguageService.js'

import { type MonacoYamlOptions } from './index.js'

/**
 * Fetch the given URL and return the response body as text.
 *
 * @param uri
 *   The uri to fetch.
 * @returns
 *   The response body as text.
 */
async function schemaRequestService(uri: string): Promise<string> {
  const response = await fetch(uri)
  if (response.ok) {
    return response.text()
  }
  throw new Error(`Schema request failed for ${uri}`)
}

/**
 * @internal
 */
export interface YAMLWorker {
  /**
   * Validate a document.
   */
  doValidation: (uri: string) => Diagnostic[] | undefined

  /**
   * Get completions in a YAML document.
   */
  doComplete: (uri: string, position: Position) => CompletionList | undefined

  /**
   * Get definitions in a YAML document.
   */
  doDefinition: (uri: string, position: Position) => LocationLink[] | undefined

  /**
   * Get hover information in a YAML document.
   */
  doHover: (uri: string, position: Position) => Hover | null | undefined

  /**
   * Get formatting edits when the user types in a YAML document.
   */
  doDocumentOnTypeFormatting: (
    uri: string,
    position: Position,
    ch: string,
    options: FormattingOptions
  ) => TextEdit[] | undefined

  /**
   * Format a YAML document using Prettier.
   */
  format: (uri: string) => TextEdit[] | undefined

  /**
   * Reset the schema state for a YAML document.
   */
  resetSchema: (uri: string) => boolean

  /**
   * Get document symbols in a YAML document.
   */
  findDocumentSymbols: (uri: string) => DocumentSymbol[] | undefined

  /**
   * Get links in a YAML document.
   */
  findLinks: (uri: string) => DocumentLink[] | undefined

  /**
   * Get code actions in a YAML document.
   */
  getCodeAction: (uri: string, range: Range, context: CodeActionContext) => CodeAction[] | undefined

  /**
   * Get folding ranges in a YAML document.
   */
  getFoldingRanges: (uri: string) => FoldingRange[] | null | undefined

  /**
   * Get selection ranges in a YAML document
   */
  getSelectionRanges: (uri: string, positions: Position[]) => SelectionRange[] | undefined
}

const telemetry: Telemetry = {
  send() {
    // Do nothing
  },
  sendError(name, error) {
    // eslint-disable-next-line no-console
    console.error('monaco-yaml', name, error)
  },
  sendTrack() {
    // Do nothing
  }
}

const workspaceContext: WorkspaceContextService = {
  resolveRelativePath(relativePath, resource) {
    return String(new URL(relativePath, resource))
  }
}

initialize<YAMLWorker, MonacoYamlOptions>((ctx, { enableSchemaRequest, ...languageSettings }) => {
  const ls = getLanguageService({
    // @ts-expect-error Type definitions are wrong. This may be null.
    schemaRequestService: enableSchemaRequest ? schemaRequestService : null,
    telemetry,
    workspaceContext,
    // Copied from https://github.com/microsoft/vscode-json-languageservice/blob/493010da9dc2cd1cc139d403d4709d97064b17e9/src/jsonLanguageTypes.ts#L325-L335
    // Usage: https://github.com/microsoft/monaco-editor/blob/f6dc0eb8fce67e57f6036f4769d92c1666cdf546/src/language/json/jsonWorker.ts#L38
    clientCapabilities: {
      textDocument: {
        completion: {
          completionItem: {
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext']
          }
        },
        moniker: {}
      }
    }
  })

  const withDocument =
    <A extends unknown[], R>(fn: (document: TextDocument, ...args: A) => R) =>
    (uri: string, ...args: A) => {
      const models = ctx.getMirrorModels()
      for (const model of models) {
        if (String(model.uri) === uri) {
          return fn(TextDocument.create(uri, 'yaml', model.version, model.getValue()), ...args)
        }
      }
    }

  ls.configure(languageSettings)

  return {
    doValidation: withDocument((document) =>
      ls.doValidation(document, Boolean(languageSettings.isKubernetes))
    ),

    doComplete: withDocument((document, position) =>
      ls.doComplete(document, position, Boolean(languageSettings.isKubernetes))
    ),

    doDefinition: withDocument((document, position) =>
      ls.doDefinition(document, { position, textDocument: document })
    ),

    doDocumentOnTypeFormatting: withDocument((document, position, ch, options) =>
      ls.doDocumentOnTypeFormatting(document, { ch, options, position, textDocument: document })
    ),

    doHover: withDocument(ls.doHover),

    format: withDocument(ls.doFormat),

    resetSchema: ls.resetSchema,

    findDocumentSymbols: withDocument(ls.findDocumentSymbols2),

    findLinks: withDocument(ls.findLinks),

    getCodeAction: withDocument((document, range, context) =>
      ls.getCodeAction(document, { range, textDocument: document, context })
    ),

    getFoldingRanges: withDocument((document) =>
      ls.getFoldingRanges(document, { lineFoldingOnly: true })
    ),

    getSelectionRanges: withDocument(ls.getSelectionRanges)
  }
})
