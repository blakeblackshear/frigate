import { fromCompletionTriggerKind, toCompletionTriggerKind } from './completionTriggerKind.js';
/**
 * Convert a Monaco editor completion context to an LSP completion context.
 *
 * @param completionContext
 *   The Monaco completion context to convert.
 * @returns
 *   The completion context as an LSP completion context.
 */
export function fromCompletionContext(completionContext) {
    const result = {
        triggerKind: fromCompletionTriggerKind(completionContext.triggerKind)
    };
    if (completionContext.triggerCharacter != null) {
        result.triggerCharacter = completionContext.triggerCharacter;
    }
    return result;
}
/**
 * Convert an LSP completion context to a Monaco editor completion context.
 *
 * @param completionContext
 *   The LSP completion context to convert.
 * @returns
 *   The completion context as Monaco editor completion context.
 */
export function toCompletionContext(completionContext) {
    const result = {
        triggerKind: toCompletionTriggerKind(completionContext.triggerKind)
    };
    if (completionContext.triggerCharacter != null) {
        result.triggerCharacter = completionContext.triggerCharacter;
    }
    return result;
}
//# sourceMappingURL=completionContext.js.map