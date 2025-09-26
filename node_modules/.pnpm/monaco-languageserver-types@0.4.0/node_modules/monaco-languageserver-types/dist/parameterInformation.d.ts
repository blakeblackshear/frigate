import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor parameter information to an LSP parameter information.
 *
 * @param parameterInformation
 *   The Monaco parameter information to convert.
 * @returns
 *   The parameter information as an LSP parameter information.
 */
export declare function fromParameterInformation(parameterInformation: monaco.languages.ParameterInformation): lsp.ParameterInformation;
/**
 * Convert an LSP parameter information to a Monaco editor parameter information.
 *
 * @param parameterInformation
 *   The LSP parameter information to convert.
 * @returns
 *   The parameter information as Monaco editor parameter information.
 */
export declare function toParameterInformation(parameterInformation: lsp.ParameterInformation): monaco.languages.ParameterInformation;
//# sourceMappingURL=parameterInformation.d.ts.map