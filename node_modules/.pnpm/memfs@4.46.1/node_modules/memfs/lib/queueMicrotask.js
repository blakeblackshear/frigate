"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = typeof queueMicrotask === 'function' ? queueMicrotask : (cb => Promise.resolve()
    .then(() => cb())
    .catch(() => { }));
//# sourceMappingURL=queueMicrotask.js.map