import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor formatting options to an LSP formatting options.
 *
 * @param formattingOptions
 *   The Monaco formatting options to convert.
 * @returns
 *   The formatting options as an LSP formatting options.
 */
export declare function fromFormattingOptions(formattingOptions: monaco.languages.FormattingOptions): lsp.FormattingOptions;
/**
 * Convert an LSP formatting options to a Monaco editor formatting options.
 *
 * @param formattingOptions
 *   The LSP formatting options to convert.
 * @returns
 *   The formatting options as Monaco editor formatting options.
 */
export declare function toFormattingOptions(formattingOptions: lsp.FormattingOptions): monaco.languages.FormattingOptions;
//# sourceMappingURL=formattingOptions.d.ts.map