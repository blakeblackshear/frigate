import { fromLocation, toLocation } from './location.js';
/**
 * Convert a Monaco editor definition to an LSP definition.
 *
 * @param definition
 *   The Monaco definition to convert.
 * @returns
 *   The definition as an LSP definition.
 */
export function fromDefinition(definition) {
    if (Array.isArray(definition)) {
        return definition.map(fromLocation);
    }
    return fromLocation(definition);
}
/**
 * Convert an LSP definition to a Monaco editor definition.
 *
 * @param definition
 *   The LSP definition to convert.
 * @returns
 *   The definition as Monaco editor definition.
 */
export function toDefinition(definition) {
    if (Array.isArray(definition)) {
        return definition.map(toLocation);
    }
    return toLocation(definition);
}
//# sourceMappingURL=definition.js.map