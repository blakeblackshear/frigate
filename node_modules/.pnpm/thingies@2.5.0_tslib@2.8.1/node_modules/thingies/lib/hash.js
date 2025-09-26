"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash = void 0;
const hash = (str) => {
    let hash = 5381;
    let i = str.length;
    while (i)
        hash = (hash * 33) ^ str.charCodeAt(--i);
    return hash >>> 0;
};
exports.hash = hash;
