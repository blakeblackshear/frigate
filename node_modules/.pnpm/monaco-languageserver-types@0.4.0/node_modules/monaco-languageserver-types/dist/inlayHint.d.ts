import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor inlay hint to an LSP inlay hint.
 *
 * @param inlayHint
 *   The Monaco inlay hint to convert.
 * @returns
 *   The inlay hint as an LSP inlay hint.
 */
export declare function fromInlayHint(inlayHint: monaco.languages.InlayHint): lsp.InlayHint;
/**
 * Convert an LSP inlay hint to a Monaco editor inlay hint.
 *
 * @param inlayHint
 *   The LSP inlay hint to convert.
 * @returns
 *   The inlay hint as Monaco editor inlay hint.
 */
export declare function toInlayHint(inlayHint: lsp.InlayHint): monaco.languages.InlayHint;
//# sourceMappingURL=inlayHint.d.ts.map