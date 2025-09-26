"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorCausalChain = getErrorCausalChain;
function getErrorCausalChain(error) {
    if (error.cause) {
        return [error, ...getErrorCausalChain(error.cause)];
    }
    return [error];
}
//# sourceMappingURL=errorUtils.js.map