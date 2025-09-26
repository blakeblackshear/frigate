/**
 * Convert a Monaco editor command to an LSP command.
 *
 * @param command
 *   The Monaco command to convert.
 * @returns
 *   The command as an LSP command.
 */
export function fromCommand(command) {
    const result = {
        title: command.title,
        command: command.id
    };
    if (command.arguments) {
        result.arguments = command.arguments;
    }
    return result;
}
/**
 * Convert an LSP command to a Monaco editor command.
 *
 * @param command
 *   The LSP command to convert.
 * @returns
 *   The command as Monaco editor command.
 */
export function toCommand(command) {
    const result = {
        title: command.title,
        id: command.command
    };
    if (command.arguments) {
        result.arguments = command.arguments;
    }
    return result;
}
//# sourceMappingURL=command.js.map