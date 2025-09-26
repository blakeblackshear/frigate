import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor definition to an LSP definition.
 *
 * @param definition
 *   The Monaco definition to convert.
 * @returns
 *   The definition as an LSP definition.
 */
export declare function fromDefinition(definition: monaco.languages.Definition): lsp.Definition;
/**
 * Convert an LSP definition to a Monaco editor definition.
 *
 * @param definition
 *   The LSP definition to convert.
 * @returns
 *   The definition as Monaco editor definition.
 */
export declare function toDefinition(definition: lsp.Definition): monaco.languages.Definition;
//# sourceMappingURL=definition.d.ts.map