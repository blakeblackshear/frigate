import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor hover to an LSP hover.
 *
 * @param hover
 *   The Monaco hover to convert.
 * @returns
 *   The hover as an LSP hover.
 */
export declare function fromHover(hover: monaco.languages.Hover): lsp.Hover;
/**
 * Convert an LSP hover to a Monaco editor hover.
 *
 * @param hover
 *   The LSP hover to convert.
 * @returns
 *   The hover as Monaco editor hover.
 */
export declare function toHover(hover: lsp.Hover): monaco.languages.Hover;
//# sourceMappingURL=hover.d.ts.map