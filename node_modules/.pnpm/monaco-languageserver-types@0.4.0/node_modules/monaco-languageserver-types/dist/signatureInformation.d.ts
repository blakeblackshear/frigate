import type * as monaco from 'monaco-types';
import type * as lsp from 'vscode-languageserver-protocol';
/**
 * Convert a Monaco editor signature information to an LSP signature information.
 *
 * @param signatureInformation
 *   The Monaco signature information to convert.
 * @returns
 *   The signature information as an LSP signature information.
 */
export declare function fromSignatureInformation(signatureInformation: monaco.languages.SignatureInformation): lsp.SignatureInformation;
/**
 * Convert an LSP signature information to a Monaco editor signature information.
 *
 * @param signatureInformation
 *   The LSP signature information to convert.
 * @returns
 *   The signature information as Monaco editor signature information.
 */
export declare function toSignatureInformation(signatureInformation: lsp.SignatureInformation): monaco.languages.SignatureInformation;
//# sourceMappingURL=signatureInformation.d.ts.map