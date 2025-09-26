"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy = void 0;
const lazy = (factory) => {
    let generated;
    const fn = (...args) => {
        if (!generated)
            generated = factory();
        return generated.apply(null, args);
    };
    return fn;
};
exports.lazy = lazy;
//# sourceMappingURL=lazyFunction.js.map