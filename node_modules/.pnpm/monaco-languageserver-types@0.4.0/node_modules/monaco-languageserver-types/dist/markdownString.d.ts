import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor markdown string to an LSP markup content.
 *
 * @param markdownString
 *   The Monaco markdown string to convert.
 * @returns
 *   The markdown string as an LSP markup content.
 */
export declare function fromMarkdownString(markdownString: monaco.IMarkdownString): lsp.MarkupContent;
/**
 * Convert an LSP markup content to a Monaco editor markdown string.
 *
 * @param markupContent
 *   The LSP markup content to convert.
 * @returns
 *   The markup content as a Monaco editor markdown string.
 */
export declare function toMarkdownString(markupContent: lsp.MarkupContent): monaco.IMarkdownString;
//# sourceMappingURL=markdownString.d.ts.map