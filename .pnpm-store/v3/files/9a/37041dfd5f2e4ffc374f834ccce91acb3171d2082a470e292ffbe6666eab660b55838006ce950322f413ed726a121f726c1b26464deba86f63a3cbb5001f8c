"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newNotAllowedError = exports.newTypeMismatchError = exports.newNotFoundError = exports.assertCanWrite = exports.assertName = exports.basename = exports.ctx = void 0;
/**
 * Creates a new {@link CoreFsaContext}.
 */
const ctx = (partial = {}) => {
    return {
        separator: '/',
        syncHandleAllowed: false,
        mode: 'read',
        ...partial,
    };
};
exports.ctx = ctx;
const basename = (path, separator) => {
    if (path[path.length - 1] === separator)
        path = path.slice(0, -1);
    const lastSlashIndex = path.lastIndexOf(separator);
    return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};
exports.basename = basename;
const nameRegex = /^(\.{1,2})$|[\/\\]/;
const assertName = (name, method, klass) => {
    const isInvalid = !name || nameRegex.test(name);
    if (isInvalid)
        throw new TypeError(`Failed to execute '${method}' on '${klass}': Name is not allowed.`);
};
exports.assertName = assertName;
const assertCanWrite = (mode) => {
    if (mode !== 'readwrite')
        throw new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError');
};
exports.assertCanWrite = assertCanWrite;
const newNotFoundError = () => new DOMException('A requested file or directory could not be found at the time an operation was processed.', 'NotFoundError');
exports.newNotFoundError = newNotFoundError;
const newTypeMismatchError = () => new DOMException('The path supplied exists, but was not an entry of requested type.', 'TypeMismatchError');
exports.newTypeMismatchError = newTypeMismatchError;
const newNotAllowedError = () => new DOMException('Permission not granted.', 'NotAllowedError');
exports.newNotAllowedError = newNotAllowedError;
//# sourceMappingURL=util.js.map