import { URI } from 'vscode-uri';
import { fromRange, toRange } from './range.js';
/**
 * Convert a Monaco editor location to an LSP location.
 *
 * @param location
 *   The Monaco location to convert.
 * @returns
 *   The location as an LSP location.
 */
export function fromLocation(location) {
    return {
        range: fromRange(location.range),
        uri: String(location.uri)
    };
}
/**
 * Convert an LSP location to a Monaco editor location.
 *
 * @param location
 *   The LSP location to convert.
 * @returns
 *   The location as Monaco editor location.
 */
export function toLocation(location) {
    return {
        range: toRange(location.range),
        uri: URI.parse(location.uri)
    };
}
//# sourceMappingURL=location.js.map