"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwitch = void 0;
const dynamicFunction_1 = require("./dynamicFunction");
const createSwitch = (fn, codegen) => {
    let counter = 0;
    const [proxy, set] = (0, dynamicFunction_1.dynamicFunction)((...args) => {
        if (counter > 2)
            set(codegen());
        counter++;
        return fn(...args);
    });
    return proxy;
};
exports.createSwitch = createSwitch;
//# sourceMappingURL=switch.js.map