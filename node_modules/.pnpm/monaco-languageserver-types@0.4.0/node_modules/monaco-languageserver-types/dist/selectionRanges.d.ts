import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert Monaco editor selection ranges to an LSP selection ranges.
 *
 * @param selectionRanges
 *   The Monaco selections range to convert.
 * @returns
 *   The selection ranges as LSP selection range.
 */
export declare function fromSelectionRanges(selectionRanges: monaco.languages.SelectionRange[]): lsp.SelectionRange | undefined;
/**
 * Convert an LSP selection range to Monaco editor selection ranges.
 *
 * @param selectionRange
 *   The LSP selection range to convert.
 * @returns
 *   The selection range as Monaco editor selection ranges.
 */
export declare function toSelectionRanges(selectionRange: lsp.SelectionRange | undefined): monaco.languages.SelectionRange[];
//# sourceMappingURL=selectionRanges.d.ts.map