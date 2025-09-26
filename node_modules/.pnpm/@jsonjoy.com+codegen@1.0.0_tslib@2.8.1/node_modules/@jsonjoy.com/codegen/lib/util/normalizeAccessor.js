"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAccessor = void 0;
const normalizeAccessor = (accessor) => {
    if (/^[a-z_][a-z_0-9]*$/i.test(accessor)) {
        return '.' + accessor;
    }
    else {
        return `[${JSON.stringify(accessor)}]`;
    }
};
exports.normalizeAccessor = normalizeAccessor;
//# sourceMappingURL=normalizeAccessor.js.map