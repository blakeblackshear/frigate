import type * as monaco from 'monaco-types'
import type * as lsp from 'vscode-languageserver-protocol'

/**
 * Convert a Monaco editor command to an LSP command.
 *
 * @param command
 *   The Monaco command to convert.
 * @returns
 *   The command as an LSP command.
 */
export function fromCommand(command: monaco.languages.Command): lsp.Command {
  const result: lsp.Command = {
    title: command.title,
    command: command.id
  }

  if (command.arguments) {
    result.arguments = command.arguments
  }

  return result
}

/**
 * Convert an LSP command to a Monaco editor command.
 *
 * @param command
 *   The LSP command to convert.
 * @returns
 *   The command as Monaco editor command.
 */
export function toCommand(command: lsp.Command): monaco.languages.Command {
  const result: monaco.languages.Command = {
    title: command.title,
    id: command.command
  }

  if (command.arguments) {
    result.arguments = command.arguments
  }

  return result
}
