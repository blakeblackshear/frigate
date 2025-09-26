/**
 * Convert a Monaco editor markdown string to an LSP markup content.
 *
 * @param markdownString
 *   The Monaco markdown string to convert.
 * @returns
 *   The markdown string as an LSP markup content.
 */
export function fromMarkdownString(markdownString) {
    return {
        kind: 'markdown',
        value: markdownString.value
    };
}
/**
 * Convert an LSP markup content to a Monaco editor markdown string.
 *
 * @param markupContent
 *   The LSP markup content to convert.
 * @returns
 *   The markup content as a Monaco editor markdown string.
 */
export function toMarkdownString(markupContent) {
    return {
        value: markupContent.value
    };
}
//# sourceMappingURL=markdownString.js.map