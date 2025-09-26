import { fromSignatureHelp, toSignatureHelp } from './signatureHelp.js';
import { fromSignatureHelpTriggerKind } from './signatureHelpTriggerKind.js';
/**
 * Convert a Monaco editor signature help context to an LSP signature help context.
 *
 * @param signatureHelpContext
 *   The Monaco signature help context to convert.
 * @returns
 *   The signature help context as an LSP signature help context.
 */
export function fromSignatureHelpContext(signatureHelpContext) {
    const result = {
        isRetrigger: signatureHelpContext.isRetrigger,
        triggerKind: fromSignatureHelpTriggerKind(signatureHelpContext.triggerKind)
    };
    if (signatureHelpContext.triggerCharacter != null) {
        result.triggerCharacter = signatureHelpContext.triggerCharacter;
    }
    if (signatureHelpContext.activeSignatureHelp) {
        result.activeSignatureHelp = fromSignatureHelp(signatureHelpContext.activeSignatureHelp);
    }
    return result;
}
/**
 * Convert an LSP signature help context to a Monaco editor signature help context.
 *
 * @param signatureHelpContext
 *   The LSP signature help context to convert.
 * @returns
 *   The signature help context as Monaco editor signature help context.
 */
export function toSignatureHelpContext(signatureHelpContext) {
    const result = {
        isRetrigger: signatureHelpContext.isRetrigger,
        triggerKind: fromSignatureHelpTriggerKind(signatureHelpContext.triggerKind)
    };
    if (signatureHelpContext.triggerCharacter != null) {
        result.triggerCharacter = signatureHelpContext.triggerCharacter;
    }
    if (signatureHelpContext.activeSignatureHelp) {
        result.activeSignatureHelp = toSignatureHelp(signatureHelpContext.activeSignatureHelp);
    }
    return result;
}
//# sourceMappingURL=signatureHelpContext.js.map