"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePath = exports.validateJsonPointer = void 0;
const validateJsonPointer = (pointer) => {
    if (typeof pointer === 'string') {
        if (pointer) {
            if (pointer[0] !== '/')
                throw new Error('POINTER_INVALID');
            if (pointer.length > 1024)
                throw new Error('POINTER_TOO_LONG');
        }
    }
    else
        (0, exports.validatePath)(pointer);
};
exports.validateJsonPointer = validateJsonPointer;
const { isArray } = Array;
const validatePath = (path) => {
    if (!isArray(path))
        throw new Error('Invalid path.');
    if (path.length > 256)
        throw new Error('Path too long.');
    for (const step of path) {
        switch (typeof step) {
            case 'string':
            case 'number':
                continue;
            default:
                throw new Error('Invalid path step.');
        }
    }
};
exports.validatePath = validatePath;
