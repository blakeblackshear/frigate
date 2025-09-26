"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromBinarySnapshot = exports.toBinarySnapshot = exports.fromBinarySnapshotSync = exports.toBinarySnapshotSync = void 0;
const CborEncoder_1 = require("@jsonjoy.com/json-pack/lib/cbor/CborEncoder");
const CborDecoder_1 = require("@jsonjoy.com/json-pack/lib/cbor/CborDecoder");
const sync_1 = require("./sync");
const async_1 = require("./async");
const shared_1 = require("./shared");
const encoder = new CborEncoder_1.CborEncoder(shared_1.writer);
const decoder = new CborDecoder_1.CborDecoder();
const toBinarySnapshotSync = (options) => {
    const snapshot = (0, sync_1.toSnapshotSync)(options);
    return encoder.encode(snapshot);
};
exports.toBinarySnapshotSync = toBinarySnapshotSync;
const fromBinarySnapshotSync = (uint8, options) => {
    const snapshot = decoder.decode(uint8);
    (0, sync_1.fromSnapshotSync)(snapshot, options);
};
exports.fromBinarySnapshotSync = fromBinarySnapshotSync;
const toBinarySnapshot = async (options) => {
    const snapshot = await (0, async_1.toSnapshot)(options);
    return encoder.encode(snapshot);
};
exports.toBinarySnapshot = toBinarySnapshot;
const fromBinarySnapshot = async (uint8, options) => {
    const snapshot = decoder.decode(uint8);
    await (0, async_1.fromSnapshot)(snapshot, options);
};
exports.fromBinarySnapshot = fromBinarySnapshot;
//# sourceMappingURL=binary.js.map