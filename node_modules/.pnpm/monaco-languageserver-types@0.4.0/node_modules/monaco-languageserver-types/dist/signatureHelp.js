import { fromSignatureInformation, toSignatureInformation } from './signatureInformation.js';
/**
 * Convert a Monaco editor signature help to an LSP signature help.
 *
 * @param signatureHelp
 *   The Monaco signature help to convert.
 * @returns
 *   The signature help as an LSP signature help.
 */
export function fromSignatureHelp(signatureHelp) {
    return {
        activeParameter: signatureHelp.activeParameter,
        activeSignature: signatureHelp.activeSignature,
        signatures: signatureHelp.signatures.map(fromSignatureInformation)
    };
}
/**
 * Convert an LSP signature help to a Monaco editor signature help.
 *
 * @param signatureHelp
 *   The LSP signature help to convert.
 * @returns
 *   The signature help as Monaco editor signature help.
 */
export function toSignatureHelp(signatureHelp) {
    var _a, _b;
    return {
        activeParameter: (_a = signatureHelp.activeParameter) !== null && _a !== void 0 ? _a : 0,
        activeSignature: (_b = signatureHelp.activeSignature) !== null && _b !== void 0 ? _b : 0,
        signatures: signatureHelp.signatures.map(toSignatureInformation)
    };
}
//# sourceMappingURL=signatureHelp.js.map