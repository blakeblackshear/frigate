"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ungzip = exports.gzip = void 0;
const fromStream_1 = require("../streams/fromStream");
const toStream_1 = require("../streams/toStream");
const pipeThrough = async (data, transform) => await (0, fromStream_1.fromStream)((0, toStream_1.toStream)(data).pipeThrough(transform));
const gzip = async (data) => await pipeThrough(data, new CompressionStream('gzip'));
exports.gzip = gzip;
const ungzip = async (data) => await pipeThrough(data, new DecompressionStream('gzip'));
exports.ungzip = ungzip;
//# sourceMappingURL=gzip.js.map