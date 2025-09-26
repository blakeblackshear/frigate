"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeFsOpenFile = void 0;
/**
 * Represents an open file. Stores additional metadata about the open file, such
 * as the seek position.
 */
class FsaNodeFsOpenFile {
    constructor(fd, createMode, flags, file, filename) {
        this.fd = fd;
        this.createMode = createMode;
        this.flags = flags;
        this.file = file;
        this.filename = filename;
        this.seek = 0;
        this.keepExistingData = !!(flags & 1024 /* FLAG_CON.O_APPEND */);
    }
    async close() { }
    async write(data, seek) {
        if (typeof seek !== 'number')
            seek = this.seek;
        else
            this.keepExistingData = true;
        const keepExistingData = this.keepExistingData;
        const writer = await this.file.createWritable({ keepExistingData });
        await writer.write({
            type: 'write',
            data,
            position: seek,
        });
        await writer.close();
        this.keepExistingData = true;
        this.seek += data.byteLength;
    }
}
exports.FsaNodeFsOpenFile = FsaNodeFsOpenFile;
//# sourceMappingURL=FsaNodeFsOpenFile.js.map