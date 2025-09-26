"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeMutex = void 0;
/**
 * Executes only one instance of give code at a time. If other calls come in in
 * parallel, they get resolved to the result of the ongoing execution.
 */
const codeMutex = () => {
    let result;
    return async (code) => {
        if (result)
            return result;
        try {
            return await (result = code());
        }
        finally {
            result = undefined;
        }
    };
};
exports.codeMutex = codeMutex;
