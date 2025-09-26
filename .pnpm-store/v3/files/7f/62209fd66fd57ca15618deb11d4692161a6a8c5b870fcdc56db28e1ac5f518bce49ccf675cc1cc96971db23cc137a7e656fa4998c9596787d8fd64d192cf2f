"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromStream = void 0;
const concat_1 = require("../buffers/concat");
const fromStream = async (stream) => {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
    }
    return (0, concat_1.listToUint8)(chunks);
};
exports.fromStream = fromStream;
//# sourceMappingURL=fromStream.js.map