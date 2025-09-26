import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor color presentation to an LSP color presentation.
 *
 * @param colorPresentation
 *   The Monaco color presentation to convert.
 * @returns
 *   The color presentation as an LSP color presentation.
 */
export declare function fromColorPresentation(colorPresentation: monaco.languages.IColorPresentation): lsp.ColorPresentation;
/**
 * Convert an LSP color presentation to a Monaco editor color presentation.
 *
 * @param colorPresentation
 *   The LSP color presentation to convert.
 * @returns
 *   The color presentation as Monaco editor color presentation.
 */
export declare function toColorPresentation(colorPresentation: lsp.ColorPresentation): monaco.languages.IColorPresentation;
//# sourceMappingURL=colorPresentation.d.ts.map