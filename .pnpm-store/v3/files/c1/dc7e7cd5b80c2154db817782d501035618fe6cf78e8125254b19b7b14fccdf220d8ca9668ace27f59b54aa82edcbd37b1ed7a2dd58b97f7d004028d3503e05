import { fromCommand, toCommand } from './command.js';
import { fromRange, toRange } from './range.js';
/**
 * Convert a Monaco editor code lens to an LSP code lens.
 *
 * @param codeLens
 *   The Monaco code lens to convert.
 * @returns
 *   The code lens as an LSP code lens.
 */
export function fromCodeLens(codeLens) {
    const result = {
        range: fromRange(codeLens.range)
    };
    if (codeLens.command) {
        result.command = fromCommand(codeLens.command);
    }
    return result;
}
/**
 * Convert an LSP code lens to a Monaco editor code lens.
 *
 * @param codeLens
 *   The LSP code lens to convert.
 * @returns
 *   The code lens as Monaco editor code lens.
 */
export function toCodeLens(codeLens) {
    const result = {
        range: toRange(codeLens.range)
    };
    if (codeLens.command) {
        result.command = toCommand(codeLens.command);
    }
    return result;
}
//# sourceMappingURL=codeLens.js.map