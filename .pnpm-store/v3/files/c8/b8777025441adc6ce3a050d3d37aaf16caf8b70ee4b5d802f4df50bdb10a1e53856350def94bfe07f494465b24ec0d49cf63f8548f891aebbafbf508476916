import { fromCommand, toCommand } from './command.js';
import { fromLocation, toLocation } from './location.js';
import { fromMarkdownString, toMarkdownString } from './markdownString.js';
/**
 * Convert a Monaco editor inlay hint label part to an LSP inlay hint label part.
 *
 * @param inlayHintLabelPart
 *   The Monaco inlay hint label part to convert.
 * @returns
 *   The inlay hint label part as an LSP inlay hint label part.
 */
export function fromInlayHintLabelPart(inlayHintLabelPart) {
    const result = {
        value: inlayHintLabelPart.label
    };
    if (inlayHintLabelPart.command) {
        result.command = fromCommand(inlayHintLabelPart.command);
    }
    if (inlayHintLabelPart.location) {
        result.location = fromLocation(inlayHintLabelPart.location);
    }
    if (typeof inlayHintLabelPart.tooltip === 'string') {
        result.tooltip = inlayHintLabelPart.tooltip;
    }
    else if (inlayHintLabelPart.tooltip) {
        result.tooltip = fromMarkdownString(inlayHintLabelPart.tooltip);
    }
    return result;
}
/**
 * Convert an LSP inlay hint label part to a Monaco editor inlay hint label part.
 *
 * @param inlayHintLabelPart
 *   The LSP inlay hint label part to convert.
 * @returns
 *   The inlay hint label part as Monaco editor inlay hint label part.
 */
export function toInlayHintLabelPart(inlayHintLabelPart) {
    const result = {
        label: inlayHintLabelPart.value
    };
    if (inlayHintLabelPart.command) {
        result.command = toCommand(inlayHintLabelPart.command);
    }
    if (inlayHintLabelPart.location) {
        result.location = toLocation(inlayHintLabelPart.location);
    }
    if (typeof inlayHintLabelPart.tooltip === 'string') {
        result.tooltip = inlayHintLabelPart.tooltip;
    }
    else if (inlayHintLabelPart.tooltip) {
        result.tooltip = toMarkdownString(inlayHintLabelPart.tooltip);
    }
    return result;
}
//# sourceMappingURL=inlayHintLabelPart.js.map