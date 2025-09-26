"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeStats = void 0;
const time = 0;
const timex = typeof BigInt === 'function' ? BigInt(time) : time;
const date = new Date(time);
class FsaNodeStats {
    constructor(isBigInt, size, kind) {
        this.kind = kind;
        const dummy = (isBigInt ? timex : time);
        this.uid = dummy;
        this.gid = dummy;
        this.rdev = dummy;
        this.blksize = dummy;
        this.ino = dummy;
        this.size = size;
        this.blocks = dummy;
        this.atime = date;
        this.mtime = date;
        this.ctime = date;
        this.birthtime = date;
        this.atimeMs = dummy;
        this.mtimeMs = dummy;
        this.ctimeMs = dummy;
        this.birthtimeMs = dummy;
        this.dev = dummy;
        this.mode = dummy;
        this.nlink = dummy;
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
exports.FsaNodeStats = FsaNodeStats;
//# sourceMappingURL=FsaNodeStats.js.map