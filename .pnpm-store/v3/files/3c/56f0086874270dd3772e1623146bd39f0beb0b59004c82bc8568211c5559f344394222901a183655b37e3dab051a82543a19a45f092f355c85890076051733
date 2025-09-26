import { fromCodeActionTriggerType } from './codeActionTriggerType.js';
import { fromMarkerData, toMarkerData } from './markerData.js';
/**
 * Convert a Monaco editor code action context to an LSP code action context.
 *
 * @param codeActionContext
 *   The Monaco code action context to convert.
 * @returns
 *   The code action context as an LSP code action context.
 */
export function fromCodeActionContext(codeActionContext) {
    const result = {
        diagnostics: codeActionContext.markers.map(fromMarkerData),
        triggerKind: fromCodeActionTriggerType(codeActionContext.trigger)
    };
    if (codeActionContext.only != null) {
        result.only = [codeActionContext.only];
    }
    return result;
}
/**
 * Convert an LSP code action context to a Monaco editor code action context.
 *
 * @param codeActionContext
 *   The LSP code action context to convert.
 * @returns
 *   The code action context as Monaco editor code action context.
 */
export function toCodeActionContext(codeActionContext) {
    var _a, _b;
    const result = {
        markers: codeActionContext.diagnostics.map(toMarkerData),
        trigger: fromCodeActionTriggerType((_a = codeActionContext.triggerKind) !== null && _a !== void 0 ? _a : 2)
    };
    if ((_b = codeActionContext.only) === null || _b === void 0 ? void 0 : _b[0]) {
        result.only = codeActionContext.only[0];
    }
    return result;
}
//# sourceMappingURL=codeActionContext.js.map