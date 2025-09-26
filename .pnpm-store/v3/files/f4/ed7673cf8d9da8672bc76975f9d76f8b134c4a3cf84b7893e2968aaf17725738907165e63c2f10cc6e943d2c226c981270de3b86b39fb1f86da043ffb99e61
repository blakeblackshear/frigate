"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFileSystemHandle = void 0;
const NodePermissionStatus_1 = require("./NodePermissionStatus");
/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
class NodeFileSystemHandle {
    constructor(kind, name) {
        this.kind = kind;
        this.name = name;
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
        const { mode } = fileSystemHandlePermissionDescriptor;
        // Check if the requested mode is compatible with the context mode
        const requestedMode = mode;
        const contextMode = this.ctx.mode;
        // If requesting readwrite but context only allows read, deny
        if (requestedMode === 'readwrite' && contextMode === 'read') {
            return new NodePermissionStatus_1.NodePermissionStatus(requestedMode, 'denied');
        }
        try {
            // Use Node.js fs.promises.access() to check permissions asynchronously
            let accessMode = 0 /* AMODE.F_OK */;
            if (mode === 'read') {
                accessMode = 4 /* AMODE.R_OK */;
            }
            else if (mode === 'readwrite') {
                accessMode = 4 /* AMODE.R_OK */ | 2 /* AMODE.W_OK */;
            }
            // Use asynchronous access check
            await this.fs.promises.access(this.__path, accessMode);
            return new NodePermissionStatus_1.NodePermissionStatus(mode, 'granted');
        }
        catch (error) {
            // If access check fails, permission is denied
            return new NodePermissionStatus_1.NodePermissionStatus(mode, 'denied');
        }
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
exports.NodeFileSystemHandle = NodeFileSystemHandle;
//# sourceMappingURL=NodeFileSystemHandle.js.map