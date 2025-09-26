"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeToFsa = void 0;
const tslib_1 = require("tslib");
const NodeFileSystemDirectoryHandle_1 = require("./NodeFileSystemDirectoryHandle");
tslib_1.__exportStar(require("./types"), exports);
tslib_1.__exportStar(require("./NodeFileSystemHandle"), exports);
tslib_1.__exportStar(require("./NodeFileSystemDirectoryHandle"), exports);
tslib_1.__exportStar(require("./NodeFileSystemFileHandle"), exports);
const nodeToFsa = (fs, dirPath, ctx) => {
    return new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, dirPath, ctx);
};
exports.nodeToFsa = nodeToFsa;
//# sourceMappingURL=index.js.map