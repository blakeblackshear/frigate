"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFloat32 = void 0;
const view = new DataView(new ArrayBuffer(4));
const isFloat32 = (n) => {
    view.setFloat32(0, n);
    return n === view.getFloat32(0);
};
exports.isFloat32 = isFloat32;
//# sourceMappingURL=isFloat32.js.map