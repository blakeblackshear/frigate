"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromJsonSnapshot = exports.toJsonSnapshot = exports.fromJsonSnapshotSync = exports.toJsonSnapshotSync = void 0;
const JsonEncoder_1 = require("@jsonjoy.com/json-pack/lib/json/JsonEncoder");
const JsonDecoder_1 = require("@jsonjoy.com/json-pack/lib/json/JsonDecoder");
const sync_1 = require("./sync");
const async_1 = require("./async");
const shared_1 = require("./shared");
const encoder = new JsonEncoder_1.JsonEncoder(shared_1.writer);
const decoder = new JsonDecoder_1.JsonDecoder();
const toJsonSnapshotSync = (options) => {
    const snapshot = (0, sync_1.toSnapshotSync)(options);
    return encoder.encode(snapshot);
};
exports.toJsonSnapshotSync = toJsonSnapshotSync;
const fromJsonSnapshotSync = (uint8, options) => {
    const snapshot = decoder.read(uint8);
    (0, sync_1.fromSnapshotSync)(snapshot, options);
};
exports.fromJsonSnapshotSync = fromJsonSnapshotSync;
const toJsonSnapshot = async (options) => {
    const snapshot = await (0, async_1.toSnapshot)(options);
    return encoder.encode(snapshot);
};
exports.toJsonSnapshot = toJsonSnapshot;
const fromJsonSnapshot = async (uint8, options) => {
    const snapshot = decoder.read(uint8);
    await (0, async_1.fromSnapshot)(snapshot, options);
};
exports.fromJsonSnapshot = fromJsonSnapshot;
//# sourceMappingURL=json.js.map