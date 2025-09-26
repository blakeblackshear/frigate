"use strict";
// Here we mock the global `process` variable in case we are not in Node's environment.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProcess = createProcess;
/**
 * Looks to return a `process` object, if one is available.
 *
 * The global `process` is returned if defined;
 * otherwise `require('process')` is attempted.
 *
 * If that fails, `undefined` is returned.
 *
 * @return {IProcess | undefined}
 */
const maybeReturnProcess = () => {
    if (typeof process !== 'undefined') {
        return process;
    }
    try {
        return require('process');
    }
    catch {
        return undefined;
    }
};
function createProcess() {
    const p = maybeReturnProcess() || {};
    if (!p.cwd)
        p.cwd = () => '/';
    if (!p.emitWarning)
        p.emitWarning = (message, type) => {
            // tslint:disable-next-line:no-console
            console.warn(`${type}${type ? ': ' : ''}${message}`);
        };
    if (!p.env)
        p.env = {};
    return p;
}
exports.default = createProcess();
//# sourceMappingURL=process.js.map