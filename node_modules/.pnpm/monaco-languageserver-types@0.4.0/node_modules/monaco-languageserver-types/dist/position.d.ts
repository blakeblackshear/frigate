import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor position to an LSP range.
 *
 * @param position
 *   The Monaco position to convert.
 * @returns
 *   The position as an LSP position.
 */
export declare function fromPosition(position: monaco.IPosition): lsp.Position;
/**
 * Convert an LSP position to a Monaco editor position.
 *
 * @param position
 *   The LSP position to convert.
 * @returns
 *   The position as Monaco editor position.
 */
export declare function toPosition(position: lsp.Position): monaco.IPosition;
//# sourceMappingURL=position.d.ts.map