"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreFileSystemDirectoryHandle = void 0;
const CoreFileSystemHandle_1 = require("./CoreFileSystemHandle");
const util_1 = require("./util");
const CoreFileSystemFileHandle_1 = require("./CoreFileSystemFileHandle");
const buffer_1 = require("../vendor/node/internal/buffer");
const constants_1 = require("../node/constants");
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
class CoreFileSystemDirectoryHandle extends CoreFileSystemHandle_1.CoreFileSystemHandle {
    constructor(_core, path, ctx = {}) {
        const fullCtx = (0, util_1.ctx)(ctx);
        super('directory', (0, util_1.basename)(path, fullCtx.separator), fullCtx);
        this._core = _core;
        this.ctx = fullCtx;
        this.__path = path[path.length - 1] === this.ctx.separator ? path : path + this.ctx.separator;
    }
    /**
     * Returns a new array iterator containing the keys for each item in
     * {@link CoreFileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
     */
    async *keys() {
        try {
            const link = this._core.getResolvedLinkOrThrow(this.__path);
            const children = link.children;
            for (const [name] of children) {
                if (name !== '.' && name !== '..') {
                    yield name;
                }
            }
        }
        catch (error) {
            this._handleError(error, 'keys');
        }
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
     */
    async *entries() {
        const { __path: path, _core, ctx } = this;
        try {
            const link = _core.getResolvedLinkOrThrow(path);
            const children = link.children;
            for (const [name, childLink] of children) {
                if (name !== '.' && name !== '..' && childLink) {
                    const childPath = path + name;
                    const node = childLink.getNode();
                    if (node.isDirectory()) {
                        yield [name, new CoreFileSystemDirectoryHandle(_core, childPath, ctx)];
                    }
                    else if (node.isFile()) {
                        yield [name, new CoreFileSystemFileHandle_1.CoreFileSystemFileHandle(_core, childPath, ctx)];
                    }
                }
            }
        }
        catch (error) {
            this._handleError(error, 'entries');
        }
    }
    /**
     * Returns a new array iterator containing the values for each index in the
     * {@link FileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
     */
    async *values() {
        for await (const [, value] of this.entries())
            yield value;
    }
    /**
     * Returns a {@link CoreFileSystemDirectoryHandle} for a subdirectory with the specified
     * name within the directory handle on which the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
     * @param name A string representing the {@link CoreFileSystemHandle} name of
     *        the subdirectory you wish to retrieve.
     * @param options An optional object containing options for the retrieved
     *        subdirectory.
     */
    async getDirectoryHandle(name, options) {
        (0, util_1.assertName)(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        try {
            const link = this._core.getResolvedLink(filename);
            if (link) {
                const node = link.getNode();
                if (!node.isDirectory())
                    throw (0, util_1.newTypeMismatchError)();
                return new CoreFileSystemDirectoryHandle(this._core, filename, this.ctx);
            }
            else {
                throw new Error('ENOENT'); // Simulate error for consistency with catch block
            }
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                if (error.code === "ENOENT" /* ERROR_CODE.ENOENT */ || error.message === 'ENOENT') {
                    if (options?.create) {
                        (0, util_1.assertCanWrite)(this.ctx.mode);
                        try {
                            this._core.mkdir(filename, 0o755);
                            return new CoreFileSystemDirectoryHandle(this._core, filename, this.ctx);
                        }
                        catch (createError) {
                            if (createError && typeof createError === 'object' && createError.code === "EACCES" /* ERROR_CODE.EACCES */) {
                                throw (0, util_1.newNotAllowedError)();
                            }
                            throw createError;
                        }
                    }
                    throw (0, util_1.newNotFoundError)();
                }
                if (error.code === "EACCES" /* ERROR_CODE.EACCES */) {
                    throw (0, util_1.newNotAllowedError)();
                }
            }
            throw error;
        }
    }
    /**
     * Returns a {@link CoreFileSystemFileHandle} for a file with the specified name,
     * within the directory the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
     * @param name A string representing the {@link CoreFileSystemHandle} name of
     *        the file you wish to retrieve.
     * @param options An optional object containing options for the retrieved file.
     */
    async getFileHandle(name, options) {
        (0, util_1.assertName)(name, 'getFileHandle', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        try {
            const link = this._core.getResolvedLink(filename);
            if (link) {
                const node = link.getNode();
                if (!node.isFile())
                    throw (0, util_1.newTypeMismatchError)();
                return new CoreFileSystemFileHandle_1.CoreFileSystemFileHandle(this._core, filename, this.ctx);
            }
            else {
                throw new Error('ENOENT'); // Simulate error for consistency with catch block
            }
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                if (error.code === "ENOENT" /* ERROR_CODE.ENOENT */ || error.message === 'ENOENT') {
                    if (options?.create) {
                        (0, util_1.assertCanWrite)(this.ctx.mode);
                        try {
                            this._core.writeFile(filename, buffer_1.Buffer.alloc(0), constants_1.FLAGS.w, 438 /* MODE.FILE */);
                            return new CoreFileSystemFileHandle_1.CoreFileSystemFileHandle(this._core, filename, this.ctx);
                        }
                        catch (createError) {
                            if (createError && typeof createError === 'object' && createError.code === "EACCES" /* ERROR_CODE.EACCES */) {
                                throw (0, util_1.newNotAllowedError)();
                            }
                            throw createError;
                        }
                    }
                    throw (0, util_1.newNotFoundError)();
                }
                if (error.code === "EACCES" /* ERROR_CODE.EACCES */) {
                    throw (0, util_1.newNotAllowedError)();
                }
            }
            throw error;
        }
    }
    /**
     * Attempts to remove an entry if the directory handle contains a file or
     * directory called the name specified.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
     * @param name A string representing the {@link CoreFileSystemHandle} name of the
     *        entry you wish to remove.
     * @param options An optional object containing options.
     */
    async removeEntry(name, { recursive = false } = {}) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        (0, util_1.assertName)(name, 'removeEntry', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        try {
            const link = this._core.getResolvedLinkOrThrow(filename);
            const node = link.getNode();
            if (node.isFile()) {
                this._core.unlink(filename);
            }
            else if (node.isDirectory()) {
                this._core.rmdir(filename, recursive);
            }
            else {
                throw (0, util_1.newTypeMismatchError)();
            }
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case "ENOENT" /* ERROR_CODE.ENOENT */: {
                        throw (0, util_1.newNotFoundError)();
                    }
                    case "EACCES" /* ERROR_CODE.EACCES */:
                        throw (0, util_1.newNotAllowedError)();
                    case "ENOTEMPTY" /* ERROR_CODE.ENOTEMPTY */:
                        throw new DOMException('The object can not be modified in this way.', 'InvalidModificationError');
                }
            }
            throw error;
        }
    }
    /**
     * The `resolve()` method of the {@link FileSystemDirectoryHandle} interface
     * returns an {@link Array} of directory names from the parent handle to the specified
     * child entry, with the name of the child entry as the last array item.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/resolve
     * @param possibleDescendant The {@link CoreFileSystemHandle} from which
     *        to return the relative path.
     */
    async resolve(possibleDescendant) {
        if (possibleDescendant instanceof CoreFileSystemDirectoryHandle ||
            possibleDescendant instanceof CoreFileSystemFileHandle_1.CoreFileSystemFileHandle) {
            // First check if they are from the same core instance
            if (possibleDescendant._core !== this._core)
                return null;
            const path = this.__path;
            const childPath = possibleDescendant.__path;
            if (!childPath.startsWith(path))
                return null;
            let relative = childPath.slice(path.length);
            if (relative === '')
                return [];
            const separator = this.ctx.separator;
            if (relative[0] === separator)
                relative = relative.slice(1);
            return relative.split(separator);
        }
        return null;
    }
    _handleError(error, method) {
        if (error instanceof DOMException)
            throw error;
        if (error && typeof error === 'object') {
            switch (error.code) {
                case "ENOENT" /* ERROR_CODE.ENOENT */:
                    throw (0, util_1.newNotFoundError)();
                case "EACCES" /* ERROR_CODE.EACCES */:
                    throw (0, util_1.newNotAllowedError)();
            }
        }
        throw error;
    }
}
exports.CoreFileSystemDirectoryHandle = CoreFileSystemDirectoryHandle;
//# sourceMappingURL=CoreFileSystemDirectoryHandle.js.map