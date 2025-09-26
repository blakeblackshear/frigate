"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStream = void 0;
const toStream = (data) => {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        },
    });
};
exports.toStream = toStream;
//# sourceMappingURL=toStream.js.map