"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeDirent = void 0;
class FsaNodeDirent {
    constructor(name, kind) {
        this.name = name;
        this.kind = kind;
    }
    isDirectory() {
        return this.kind === 'directory';
    }
    isFile() {
        return this.kind === 'file';
    }
    isBlockDevice() {
        return false;
    }
    isCharacterDevice() {
        return false;
    }
    isSymbolicLink() {
        return false;
    }
    isFIFO() {
        return false;
    }
    isSocket() {
        return false;
    }
}
exports.FsaNodeDirent = FsaNodeDirent;
//# sourceMappingURL=FsaNodeDirent.js.map