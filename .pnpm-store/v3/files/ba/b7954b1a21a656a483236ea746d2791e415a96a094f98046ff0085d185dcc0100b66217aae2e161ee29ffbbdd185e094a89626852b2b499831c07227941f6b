import { URI } from 'vscode-uri';
import { fromMarkerSeverity, toMarkerSeverity } from './markerSeverity.js';
import { fromMarkerTag, toMarkerTag } from './markerTag.js';
import { fromRange, toRange } from './range.js';
import { fromRelatedInformation, toRelatedInformation } from './relatedInformation.js';
/**
 * Convert a Monaco editor marker data to an LSP diagnostic.
 *
 * @param markerData
 *   The Monaco marker data to convert.
 * @returns
 *   The marker data as an LSP diagnostic.
 */
export function fromMarkerData(markerData) {
    const diagnostic = {
        message: markerData.message,
        range: fromRange(markerData),
        severity: fromMarkerSeverity(markerData.severity)
    };
    if (typeof markerData.code === 'string') {
        diagnostic.code = markerData.code;
    }
    else if (markerData.code != null) {
        diagnostic.code = markerData.code.value;
        diagnostic.codeDescription = { href: String(markerData.code.target) };
    }
    if (markerData.relatedInformation) {
        diagnostic.relatedInformation = markerData.relatedInformation.map(fromRelatedInformation);
    }
    if (markerData.tags) {
        diagnostic.tags = markerData.tags.map(fromMarkerTag);
    }
    if (markerData.source != null) {
        diagnostic.source = markerData.source;
    }
    return diagnostic;
}
/**
 * Convert an LSP diagnostic to a Monaco editor marker data.
 *
 * @param diagnostic
 *   The LSP diagnostic to convert.
 * @returns
 *   The diagnostic as Monaco editor marker data.
 */
export function toMarkerData(diagnostic) {
    const markerData = {
        ...toRange(diagnostic.range),
        message: diagnostic.message,
        severity: diagnostic.severity
            ? toMarkerSeverity(diagnostic.severity)
            : 8
    };
    if (diagnostic.code != null) {
        markerData.code =
            diagnostic.codeDescription == null
                ? String(diagnostic.code)
                : { value: String(diagnostic.code), target: URI.parse(diagnostic.codeDescription.href) };
    }
    if (diagnostic.relatedInformation) {
        markerData.relatedInformation = diagnostic.relatedInformation.map(toRelatedInformation);
    }
    if (diagnostic.tags) {
        markerData.tags = diagnostic.tags.map(toMarkerTag);
    }
    if (diagnostic.source != null) {
        markerData.source = diagnostic.source;
    }
    return markerData;
}
//# sourceMappingURL=markerData.js.map