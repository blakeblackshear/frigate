/**
 * Convert a Monaco editor marker severity to an LSP diagnostic severity.
 *
 * @param severity
 *   The Monaco marker severity to convert.
 * @returns
 *   The marker severity as an LSP diagnostic severity.
 */
export function fromMarkerSeverity(severity) {
    if (severity === 1) {
        return 4;
    }
    if (severity === 2) {
        return 3;
    }
    if (severity === 4) {
        return 2;
    }
    return 1;
}
/**
 * Convert an LSP diagnostic severity to a Monaco editor marker severity.
 *
 * @param severity
 *   The LSP diagnostic severity to convert.
 * @returns
 *   The diagnostic severity as Monaco editor marker severity.
 */
export function toMarkerSeverity(severity) {
    if (severity === 4) {
        return 1;
    }
    if (severity === 3) {
        return 2;
    }
    if (severity === 2) {
        return 4;
    }
    return 8;
}
//# sourceMappingURL=markerSeverity.js.map