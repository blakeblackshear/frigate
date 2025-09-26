import { URI } from 'vscode-uri';
import { fromRange, toRange } from './range.js';
/**
 * Convert a Monaco editor related information to an LSP diagnostic related information.
 *
 * @param relatedInformation
 *   The Monaco related information to convert.
 * @returns
 *   The related information as an LSP diagnostic related information.
 */
export function fromRelatedInformation(relatedInformation) {
    return {
        location: {
            range: fromRange(relatedInformation),
            uri: String(relatedInformation.resource)
        },
        message: relatedInformation.message
    };
}
/**
 * Convert an LSP diagnostic related information to a Monaco editor related information.
 *
 * @param relatedInformation
 *   The LSP diagnostic related information to convert.
 * @returns
 *   The diagnostic related information as Monaco editor related information.
 */
export function toRelatedInformation(relatedInformation) {
    return {
        ...toRange(relatedInformation.location.range),
        message: relatedInformation.message,
        resource: URI.parse(relatedInformation.location.uri)
    };
}
//# sourceMappingURL=relatedInformation.js.map