"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreFileSystemHandle = void 0;
const CorePermissionStatus_1 = require("./CorePermissionStatus");
/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a core `Superblock`.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
class CoreFileSystemHandle {
    constructor(kind, name, ctx) {
        this.kind = kind;
        this.name = name;
        this.ctx = ctx;
    }
    /**
     * Compares two handles to see if the associated entries (either a file or directory) match.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
     */
    isSameEntry(fileSystemHandle) {
        return (this.constructor === fileSystemHandle.constructor && this.__path === fileSystemHandle.__path);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
     */
    async queryPermission(fileSystemHandlePermissionDescriptor) {
        // Check if the requested mode is compatible with the context mode
        const requestedMode = fileSystemHandlePermissionDescriptor.mode;
        const contextMode = this.ctx.mode;
        // If requesting readwrite but context only allows read, deny
        if (requestedMode === 'readwrite' && contextMode === 'read') {
            return new CorePermissionStatus_1.CorePermissionStatus('denied', requestedMode);
        }
        // Otherwise grant the permission
        return new CorePermissionStatus_1.CorePermissionStatus('granted', requestedMode);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
     */
    async remove({ recursive } = { recursive: false }) {
        throw new Error('Not implemented');
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
     */
    requestPermission(fileSystemHandlePermissionDescriptor) {
        throw new Error('Not implemented');
    }
}
exports.CoreFileSystemHandle = CoreFileSystemHandle;
//# sourceMappingURL=CoreFileSystemHandle.js.map