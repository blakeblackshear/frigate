"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicFunction = void 0;
const dynamicFunction = (implementation) => {
    const proxy = ((...args) => implementation(...args));
    const set = (f) => {
        implementation = f;
    };
    return [proxy, set];
};
exports.dynamicFunction = dynamicFunction;
//# sourceMappingURL=dynamicFunction.js.map