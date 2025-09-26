import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor inlay hint kind to an LSP inlay hint kind.
 *
 * @param inlayHintKind
 *   The Monaco inlay hint kind to convert.
 * @returns
 *   The inlay hint kind as an LSP inlay hint kind.
 */
export declare function fromInlayHintKind(inlayHintKind: monaco.languages.InlayHintKind): lsp.InlayHintKind;
/**
 * Convert an LSP inlay hint kind to a Monaco editor inlay hint kind.
 *
 * @param inlayHintKind
 *   The LSP inlay hint kind to convert.
 * @returns
 *   The inlay hint kind as Monaco editor inlay hint kind.
 */
export declare function toInlayHintKind(inlayHintKind: lsp.InlayHintKind): monaco.languages.InlayHintKind;
//# sourceMappingURL=inlayHintKind.d.ts.map