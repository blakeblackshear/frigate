import { fromMarkdownString, toMarkdownString } from './markdownString.js';
/**
 * Convert a Monaco editor parameter information to an LSP parameter information.
 *
 * @param parameterInformation
 *   The Monaco parameter information to convert.
 * @returns
 *   The parameter information as an LSP parameter information.
 */
export function fromParameterInformation(parameterInformation) {
    const result = {
        label: parameterInformation.label
    };
    if (typeof parameterInformation.documentation === 'string') {
        result.documentation = parameterInformation.documentation;
    }
    else if (parameterInformation.documentation) {
        result.documentation = fromMarkdownString(parameterInformation.documentation);
    }
    return result;
}
/**
 * Convert an LSP parameter information to a Monaco editor parameter information.
 *
 * @param parameterInformation
 *   The LSP parameter information to convert.
 * @returns
 *   The parameter information as Monaco editor parameter information.
 */
export function toParameterInformation(parameterInformation) {
    const result = {
        label: parameterInformation.label
    };
    if (typeof parameterInformation.documentation === 'string') {
        result.documentation = parameterInformation.documentation;
    }
    else if (parameterInformation.documentation) {
        result.documentation = toMarkdownString(parameterInformation.documentation);
    }
    return result;
}
//# sourceMappingURL=parameterInformation.js.map