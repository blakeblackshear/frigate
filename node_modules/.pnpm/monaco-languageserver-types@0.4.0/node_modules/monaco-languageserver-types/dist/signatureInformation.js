import { fromMarkdownString, toMarkdownString } from './markdownString.js';
import { fromParameterInformation, toParameterInformation } from './parameterInformation.js';
/**
 * Convert a Monaco editor signature information to an LSP signature information.
 *
 * @param signatureInformation
 *   The Monaco signature information to convert.
 * @returns
 *   The signature information as an LSP signature information.
 */
export function fromSignatureInformation(signatureInformation) {
    const result = {
        label: signatureInformation.label,
        parameters: signatureInformation.parameters.map(fromParameterInformation)
    };
    if (typeof signatureInformation.documentation === 'string') {
        result.documentation = signatureInformation.documentation;
    }
    else if (signatureInformation.documentation) {
        result.documentation = fromMarkdownString(signatureInformation.documentation);
    }
    if (signatureInformation.activeParameter != null) {
        result.activeParameter = signatureInformation.activeParameter;
    }
    return result;
}
/**
 * Convert an LSP signature information to a Monaco editor signature information.
 *
 * @param signatureInformation
 *   The LSP signature information to convert.
 * @returns
 *   The signature information as Monaco editor signature information.
 */
export function toSignatureInformation(signatureInformation) {
    var _a, _b;
    const result = {
        label: signatureInformation.label,
        parameters: (_b = (_a = signatureInformation.parameters) === null || _a === void 0 ? void 0 : _a.map(toParameterInformation)) !== null && _b !== void 0 ? _b : []
    };
    if (typeof signatureInformation.documentation === 'string') {
        result.documentation = signatureInformation.documentation;
    }
    else if (signatureInformation.documentation) {
        result.documentation = toMarkdownString(signatureInformation.documentation);
    }
    if (signatureInformation.activeParameter != null) {
        result.activeParameter = signatureInformation.activeParameter;
    }
    return result;
}
//# sourceMappingURL=signatureInformation.js.map