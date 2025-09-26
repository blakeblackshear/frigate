import { URI } from 'vscode-uri';
import { fromRange, toRange } from './range.js';
/**
 * Convert a Monaco editor location link to an LSP location link.
 *
 * @param locationLink
 *   The Monaco location link to convert.
 * @returns
 *   The location link as an LSP location link.
 */
export function fromLocationLink(locationLink) {
    const result = {
        targetRange: fromRange(locationLink.range),
        targetSelectionRange: locationLink.targetSelectionRange
            ? fromRange(locationLink.targetSelectionRange)
            : fromRange(locationLink.range),
        targetUri: String(locationLink.uri)
    };
    if (locationLink.originSelectionRange) {
        result.originSelectionRange = fromRange(locationLink.originSelectionRange);
    }
    return result;
}
/**
 * Convert an LSP location link to a Monaco editor location link.
 *
 * @param locationLink
 *   The LSP location link to convert.
 * @returns
 *   The location link as Monaco editor location link.
 */
export function toLocationLink(locationLink) {
    const result = {
        range: toRange(locationLink.targetRange),
        targetSelectionRange: toRange(locationLink.targetSelectionRange),
        uri: URI.parse(locationLink.targetUri)
    };
    if (locationLink.originSelectionRange) {
        result.originSelectionRange = toRange(locationLink.originSelectionRange);
    }
    return result;
}
//# sourceMappingURL=locationLink.js.map