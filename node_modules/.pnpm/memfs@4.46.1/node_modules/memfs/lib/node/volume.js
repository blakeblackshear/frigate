"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSWatcher = exports.StatWatcher = exports.Volume = void 0;
exports.pathToSteps = pathToSteps;
exports.dataToStr = dataToStr;
exports.toUnixTimestamp = toUnixTimestamp;
const path_1 = require("../vendor/node/path");
const core_1 = require("../core");
const Stats_1 = require("./Stats");
const Dirent_1 = require("./Dirent");
const StatFs_1 = require("./StatFs");
const buffer_1 = require("../vendor/node/internal/buffer");
const queueMicrotask_1 = require("../queueMicrotask");
const setTimeoutUnref_1 = require("../setTimeoutUnref");
const stream_1 = require("../vendor/node/stream");
const constants_1 = require("../constants");
const events_1 = require("../vendor/node/events");
const encoding_1 = require("../encoding");
const FileHandle_1 = require("./FileHandle");
const util_1 = require("../vendor/node/util");
const FsPromises_1 = require("./FsPromises");
const print_1 = require("../print");
const constants_2 = require("./constants");
const options_1 = require("./options");
const util_2 = require("./util");
const Dir_1 = require("./Dir");
const util_3 = require("../core/util");
const resolveCrossPlatform = path_1.resolve;
const { O_SYMLINK, F_OK, R_OK, W_OK, X_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE } = constants_1.constants;
const pathSep = path_1.posix ? path_1.posix.sep : path_1.sep;
const pathRelative = path_1.posix ? path_1.posix.relative : path_1.relative;
const pathJoin = path_1.posix ? path_1.posix.join : path_1.join;
const pathDirname = path_1.posix ? path_1.posix.dirname : path_1.dirname;
const pathNormalize = path_1.posix ? path_1.posix.normalize : path_1.normalize;
// ---------------------------------------- Constants
const kMinPoolSpace = 128;
// ---------------------------------------- Utility functions
function pathToSteps(path) {
    return (0, util_3.filenameToSteps)((0, util_2.pathToFilename)(path));
}
function dataToStr(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data.toString(encoding);
    else if (data instanceof Uint8Array)
        return (0, buffer_1.bufferFrom)(data).toString(encoding);
    else
        return String(data);
}
// converts Date or number to a fractional UNIX timestamp
function toUnixTimestamp(time) {
    // tslint:disable-next-line triple-equals
    if (typeof time === 'string' && +time == time) {
        return +time;
    }
    if (time instanceof Date) {
        return time.getTime() / 1000;
    }
    if (isFinite(time)) {
        if (time < 0) {
            return Date.now() / 1000;
        }
        return time;
    }
    throw new Error('Cannot parse time: ' + time);
}
function validateUid(uid) {
    if (typeof uid !== 'number')
        throw TypeError(constants_2.ERRSTR.UID);
}
function validateGid(gid) {
    if (typeof gid !== 'number')
        throw TypeError(constants_2.ERRSTR.GID);
}
/**
 * `Volume` represents a file system.
 */
class Volume {
    get promises() {
        if (this.promisesApi === null)
            throw new Error('Promise is not supported in this environment.');
        return this.promisesApi;
    }
    constructor(_core = new core_1.Superblock()) {
        this._core = _core;
        this.promisesApi = new FsPromises_1.FsPromises(this, FileHandle_1.FileHandle);
        this.openSync = (path, flags, mode = 438 /* MODE.DEFAULT */) => {
            // Validate (1) mode; (2) path; (3) flags - in that order.
            const modeNum = (0, util_2.modeToNumber)(mode);
            const fileName = (0, util_2.pathToFilename)(path);
            const flagsNum = (0, util_2.flagsToNumber)(flags);
            return this._core.open(fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK));
        };
        this.open = (path, flags, a, b) => {
            let mode = a;
            let callback = b;
            if (typeof a === 'function') {
                mode = 438 /* MODE.DEFAULT */;
                callback = a;
            }
            mode = mode || 438 /* MODE.DEFAULT */;
            const modeNum = (0, util_2.modeToNumber)(mode);
            const fileName = (0, util_2.pathToFilename)(path);
            const flagsNum = (0, util_2.flagsToNumber)(flags);
            this.wrapAsync(this._core.open, [fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK)], callback);
        };
        this.closeSync = (fd) => {
            this._core.close(fd);
        };
        this.close = (fd, callback) => {
            (0, util_3.validateFd)(fd);
            const file = this._core.getFileByFdOrThrow(fd, 'close');
            this.wrapAsync(this._core.close, [file.fd], callback);
        };
        this.readSync = (fd, buffer, offset, length, position) => {
            (0, util_3.validateFd)(fd);
            return this._core.read(fd, buffer, offset, length, position);
        };
        this.read = (fd, buffer, offset, length, position, callback) => {
            (0, util_2.validateCallback)(callback);
            if (length === 0) {
                // This `if` branch is from Node.js
                return (0, queueMicrotask_1.default)(() => {
                    if (callback)
                        callback(null, 0, buffer);
                });
            }
            Promise.resolve().then(() => {
                try {
                    const bytes = this._core.read(fd, buffer, offset, length, position);
                    callback(null, bytes, buffer);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.readv = (fd, buffers, a, b) => {
            let position = a;
            let callback = b;
            if (typeof a === 'function')
                [position, callback] = [null, a];
            (0, util_2.validateCallback)(callback);
            Promise.resolve().then(() => {
                try {
                    const bytes = this._core.readv(fd, buffers, position);
                    callback(null, bytes, buffers);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.readvSync = (fd, buffers, position) => {
            (0, util_3.validateFd)(fd);
            return this._core.readv(fd, buffers, position ?? null);
        };
        this._readfile = (id, flagsNum, encoding) => {
            let result;
            const isUserFd = typeof id === 'number';
            const userOwnsFd = isUserFd && (0, util_3.isFd)(id);
            let fd;
            if (userOwnsFd)
                fd = id;
            else {
                const filename = (0, util_2.pathToFilename)(id);
                // Check if original path had trailing slash (indicates directory intent)
                const originalPath = String(id);
                const hasTrailingSlash = originalPath.length > 1 && originalPath.endsWith('/');
                const link = this._core.getResolvedLinkOrThrow(filename, 'open');
                const node = link.getNode();
                if (node.isDirectory())
                    throw (0, util_2.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
                // If path had trailing slash but resolved to a file, throw ENOTDIR
                if (hasTrailingSlash && node.isFile()) {
                    throw (0, util_2.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', originalPath);
                }
                fd = this.openSync(id, flagsNum);
            }
            try {
                result = (0, util_2.bufferToEncoding)(this._core.getFileByFdOrThrow(fd).getBuffer(), encoding);
            }
            finally {
                if (!userOwnsFd) {
                    this.closeSync(fd);
                }
            }
            return result;
        };
        this.readFileSync = (file, options) => {
            const opts = (0, options_1.getReadFileOptions)(options);
            const flagsNum = (0, util_2.flagsToNumber)(opts.flag);
            return this._readfile(file, flagsNum, opts.encoding);
        };
        this.readFile = (id, a, b) => {
            const [opts, callback] = (0, options_1.optsAndCbGenerator)(options_1.getReadFileOptions)(a, b);
            const flagsNum = (0, util_2.flagsToNumber)(opts.flag);
            this.wrapAsync(this._readfile, [id, flagsNum, opts.encoding], callback);
        };
        this.writeSync = (fd, a, b, c, d) => {
            const [, buf, offset, length, position] = (0, util_2.getWriteSyncArgs)(fd, a, b, c, d);
            return this._write(fd, buf, offset, length, position);
        };
        this.write = (fd, a, b, c, d, e) => {
            const [, asStr, buf, offset, length, position, cb] = (0, util_2.getWriteArgs)(fd, a, b, c, d, e);
            Promise.resolve().then(() => {
                try {
                    const bytes = this._write(fd, buf, offset, length, position);
                    if (!asStr) {
                        cb(null, bytes, buf);
                    }
                    else {
                        cb(null, bytes, a);
                    }
                }
                catch (err) {
                    cb(err);
                }
            });
        };
        this.writev = (fd, buffers, a, b) => {
            let position = a;
            let callback = b;
            if (typeof a === 'function')
                [position, callback] = [null, a];
            (0, util_2.validateCallback)(callback);
            Promise.resolve().then(() => {
                try {
                    const bytes = this.writevBase(fd, buffers, position);
                    callback(null, bytes, buffers);
                }
                catch (err) {
                    callback(err);
                }
            });
        };
        this.writevSync = (fd, buffers, position) => {
            (0, util_3.validateFd)(fd);
            return this.writevBase(fd, buffers, position ?? null);
        };
        this.writeFileSync = (id, data, options) => {
            const opts = (0, options_1.getWriteFileOptions)(options);
            const flagsNum = (0, util_2.flagsToNumber)(opts.flag);
            const modeNum = (0, util_2.modeToNumber)(opts.mode);
            const buf = (0, util_3.dataToBuffer)(data, opts.encoding);
            this._core.writeFile(id, buf, flagsNum, modeNum);
        };
        this.writeFile = (id, data, a, b) => {
            let options = a;
            let callback = b;
            if (typeof a === 'function')
                [options, callback] = [options_1.writeFileDefaults, a];
            const cb = (0, util_2.validateCallback)(callback);
            const opts = (0, options_1.getWriteFileOptions)(options);
            const flagsNum = (0, util_2.flagsToNumber)(opts.flag);
            const modeNum = (0, util_2.modeToNumber)(opts.mode);
            const buf = (0, util_3.dataToBuffer)(data, opts.encoding);
            this.wrapAsync(this._core.writeFile, [id, buf, flagsNum, modeNum], cb);
        };
        this.copyFileSync = (src, dest, flags) => {
            const srcFilename = (0, util_2.pathToFilename)(src);
            const destFilename = (0, util_2.pathToFilename)(dest);
            return this._copyFile(srcFilename, destFilename, (flags || 0) | 0);
        };
        this.copyFile = (src, dest, a, b) => {
            const srcFilename = (0, util_2.pathToFilename)(src);
            const destFilename = (0, util_2.pathToFilename)(dest);
            let flags;
            let callback;
            if (typeof a === 'function')
                [flags, callback] = [0, a];
            else
                [flags, callback] = [a, b];
            (0, util_2.validateCallback)(callback);
            this.wrapAsync(this._copyFile, [srcFilename, destFilename, flags], callback);
        };
        this._cp = (src, dest, options) => {
            if (options.filter && !options.filter(src, dest))
                return;
            const srcStat = options.dereference ? this.statSync(src) : this.lstatSync(src);
            let destStat = null;
            try {
                destStat = this.lstatSync(dest);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
            // Check if src and dest are the same (both exist and have same inode)
            if (destStat && srcStat.ino === destStat.ino && srcStat.dev === destStat.dev)
                throw (0, util_2.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src, dest);
            // Check type compatibility
            if (destStat) {
                if (srcStat.isDirectory() && !destStat.isDirectory())
                    throw (0, util_2.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'cp', src, dest);
                if (!srcStat.isDirectory() && destStat.isDirectory())
                    throw (0, util_2.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'cp', src, dest);
            }
            // Check if trying to copy directory to subdirectory of itself
            if (srcStat.isDirectory() && this.isSrcSubdir(src, dest))
                throw (0, util_2.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src, dest);
            ENDURE_PARENT_DIR_EXISTS: {
                const parent = pathDirname(dest);
                if (!this.existsSync(parent))
                    this.mkdirSync(parent, { recursive: true });
            }
            // Handle different file types
            if (srcStat.isDirectory()) {
                if (!options.recursive)
                    throw (0, util_2.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'cp', src);
                this.cpDirSync(srcStat, destStat, src, dest, options);
            }
            else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) {
                this.cpFileSync(srcStat, destStat, src, dest, options);
            }
            else if (srcStat.isSymbolicLink() && !options.dereference) {
                // Only handle as symlink if not dereferencing
                this.cpSymlinkSync(destStat, src, dest, options);
            }
            else {
                throw (0, util_2.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'cp', src);
            }
        };
        this.linkSync = (existingPath, newPath) => {
            const existingPathFilename = (0, util_2.pathToFilename)(existingPath);
            const newPathFilename = (0, util_2.pathToFilename)(newPath);
            this._core.link(existingPathFilename, newPathFilename);
        };
        this.link = (existingPath, newPath, callback) => {
            const existingPathFilename = (0, util_2.pathToFilename)(existingPath);
            const newPathFilename = (0, util_2.pathToFilename)(newPath);
            this.wrapAsync(this._core.link, [existingPathFilename, newPathFilename], callback);
        };
        this.unlinkSync = (path) => {
            const filename = (0, util_2.pathToFilename)(path);
            this._core.unlink(filename);
        };
        this.unlink = (path, callback) => {
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._core.unlink, [filename], callback);
        };
        /**
         * `type` argument works only on Windows.
         * @param target
         * @param path
         * @param type
         */
        this.symlinkSync = (target, path, type) => {
            const targetFilename = (0, util_2.pathToFilename)(target);
            const pathFilename = (0, util_2.pathToFilename)(path);
            this._core.symlink(targetFilename, pathFilename);
        };
        this.symlink = (target, path, a, b) => {
            const callback = (0, util_2.validateCallback)(typeof a === 'function' ? a : b);
            const targetFilename = (0, util_2.pathToFilename)(target);
            const pathFilename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._core.symlink, [targetFilename, pathFilename], callback);
        };
        this._lstat = (filename, bigint = false, throwIfNoEntry = false) => {
            let link;
            try {
                link = this._core.getLinkOrThrow(filename, 'lstat');
            }
            catch (err) {
                if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && !throwIfNoEntry)
                    return undefined;
                else
                    throw err;
            }
            return Stats_1.default.build(link.getNode(), bigint);
        };
        this.lstatSync = (path, options) => {
            const { throwIfNoEntry = true, bigint = false } = (0, options_1.getStatOptions)(options);
            return this._lstat((0, util_2.pathToFilename)(path), bigint, throwIfNoEntry);
        };
        this.renameSync = (oldPath, newPath) => {
            const oldPathFilename = (0, util_2.pathToFilename)(oldPath);
            const newPathFilename = (0, util_2.pathToFilename)(newPath);
            this._core.rename(oldPathFilename, newPathFilename);
        };
        this.rename = (oldPath, newPath, callback) => {
            const oldPathFilename = (0, util_2.pathToFilename)(oldPath);
            const newPathFilename = (0, util_2.pathToFilename)(newPath);
            this.wrapAsync(this._core.rename, [oldPathFilename, newPathFilename], callback);
        };
        this.existsSync = (path) => {
            try {
                return this._exists((0, util_2.pathToFilename)(path));
            }
            catch (err) {
                return false;
            }
        };
        this.exists = (path, callback) => {
            const filename = (0, util_2.pathToFilename)(path);
            if (typeof callback !== 'function')
                throw Error(constants_2.ERRSTR.CB);
            Promise.resolve().then(() => {
                try {
                    callback(this._exists(filename));
                }
                catch (err) {
                    callback(false);
                }
            });
        };
        this.accessSync = (path, mode = F_OK) => {
            const filename = (0, util_2.pathToFilename)(path);
            mode = mode | 0;
            this._access(filename, mode);
        };
        this.access = (path, a, b) => {
            let mode = F_OK;
            let callback;
            if (typeof a !== 'function')
                [mode, callback] = [a | 0, (0, util_2.validateCallback)(b)];
            else
                callback = a;
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._access, [filename, mode], callback);
        };
        this.appendFileSync = (id, data, options) => {
            const opts = (0, options_1.getAppendFileOpts)(options);
            // Force append behavior when using a supplied file descriptor.
            if (!opts.flag || (0, util_3.isFd)(id))
                opts.flag = 'a';
            this.writeFileSync(id, data, opts);
        };
        this.appendFile = (id, data, a, b) => {
            const [opts, callback] = (0, options_1.getAppendFileOptsAndCb)(a, b);
            // Force append behavior when using a supplied file descriptor.
            if (!opts.flag || (0, util_3.isFd)(id))
                opts.flag = 'a';
            this.writeFile(id, data, opts, callback);
        };
        this._readdir = (filename, options) => {
            const steps = (0, util_3.filenameToSteps)(filename);
            const link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
            const node = link.getNode();
            if (!node.isDirectory())
                throw (0, util_2.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'scandir', filename);
            // Check we have permissions
            if (!node.canRead())
                throw (0, util_2.createError)("EACCES" /* ERROR_CODE.EACCES */, 'scandir', filename);
            const list = []; // output list
            for (const name of link.children.keys()) {
                const child = link.getChild(name);
                if (!child || name === '.' || name === '..')
                    continue;
                list.push(Dirent_1.default.build(child, options.encoding));
                // recursion
                if (options.recursive && child.children.size) {
                    const recurseOptions = { ...options, recursive: true, withFileTypes: true };
                    const childList = this._readdir(child.getPath(), recurseOptions);
                    list.push(...childList);
                }
            }
            if (!util_3.isWin && options.encoding !== 'buffer')
                list.sort((a, b) => {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
            if (options.withFileTypes)
                return list;
            let filename2 = filename;
            if (util_3.isWin)
                filename2 = filename2.replace(/\\/g, '/');
            return list.map(dirent => {
                if (options.recursive) {
                    let fullPath = pathJoin(dirent.parentPath, dirent.name.toString());
                    if (util_3.isWin) {
                        fullPath = fullPath.replace(/\\/g, '/');
                    }
                    return fullPath.replace(filename2 + path_1.posix.sep, '');
                }
                return dirent.name;
            });
        };
        this.readdirSync = (path, options) => {
            const opts = (0, options_1.getReaddirOptions)(options);
            const filename = (0, util_2.pathToFilename)(path);
            return this._readdir(filename, opts);
        };
        this.readdir = (path, a, b) => {
            const [options, callback] = (0, options_1.getReaddirOptsAndCb)(a, b);
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._readdir, [filename, options], callback);
        };
        this._readlink = (filename, encoding) => {
            const link = this._core.getLinkOrThrow(filename, 'readlink');
            const node = link.getNode();
            if (!node.isSymlink())
                throw (0, util_2.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'readlink', filename);
            return (0, encoding_1.strToEncoding)(node.symlink, encoding);
        };
        this.readlinkSync = (path, options) => {
            const opts = (0, options_1.getDefaultOpts)(options);
            const filename = (0, util_2.pathToFilename)(path);
            return this._readlink(filename, opts.encoding);
        };
        this.readlink = (path, a, b) => {
            const [opts, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._readlink, [filename, opts.encoding], callback);
        };
        this._fsync = (fd) => {
            this._core.getFileByFdOrThrow(fd, 'fsync');
        };
        this.fsyncSync = (fd) => {
            this._fsync(fd);
        };
        this.fsync = (fd, callback) => {
            this.wrapAsync(this._fsync, [fd], callback);
        };
        this._fdatasync = (fd) => {
            this._core.getFileByFdOrThrow(fd, 'fdatasync');
        };
        this.fdatasyncSync = (fd) => {
            this._fdatasync(fd);
        };
        this.fdatasync = (fd, callback) => {
            this.wrapAsync(this._fdatasync, [fd], callback);
        };
        this._ftruncate = (fd, len) => {
            const file = this._core.getFileByFdOrThrow(fd, 'ftruncate');
            file.truncate(len);
        };
        this.ftruncateSync = (fd, len) => {
            this._ftruncate(fd, len);
        };
        this.ftruncate = (fd, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = (0, util_2.validateCallback)(typeof a === 'number' ? b : a);
            this.wrapAsync(this._ftruncate, [fd, len], callback);
        };
        this._truncate = (path, len) => {
            const fd = this.openSync(path, 'r+');
            try {
                this.ftruncateSync(fd, len);
            }
            finally {
                this.closeSync(fd);
            }
        };
        /**
         * `id` should be a file descriptor or a path. `id` as file descriptor will
         * not be supported soon.
         */
        this.truncateSync = (id, len) => {
            if ((0, util_3.isFd)(id))
                return this.ftruncateSync(id, len);
            this._truncate(id, len);
        };
        this.truncate = (id, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = (0, util_2.validateCallback)(typeof a === 'number' ? b : a);
            if ((0, util_3.isFd)(id))
                return this.ftruncate(id, len, callback);
            this.wrapAsync(this._truncate, [id, len], callback);
        };
        this._futimes = (fd, atime, mtime) => {
            const file = this._core.getFileByFdOrThrow(fd, 'futimes');
            const node = file.node;
            node.atime = new Date(atime * 1000);
            node.mtime = new Date(mtime * 1000);
        };
        this.futimesSync = (fd, atime, mtime) => {
            this._futimes(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
        };
        this.futimes = (fd, atime, mtime, callback) => {
            this.wrapAsync(this._futimes, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
        };
        this._utimes = (filename, atime, mtime, followSymlinks = true) => {
            const core = this._core;
            const link = followSymlinks
                ? core.getResolvedLinkOrThrow(filename, 'utimes')
                : core.getLinkOrThrow(filename, 'lutimes');
            const node = link.getNode();
            node.atime = new Date(atime * 1000);
            node.mtime = new Date(mtime * 1000);
        };
        this.utimesSync = (path, atime, mtime) => {
            this._utimes((0, util_2.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true);
        };
        this.utimes = (path, atime, mtime, callback) => {
            this.wrapAsync(this._utimes, [(0, util_2.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true], callback);
        };
        this.lutimesSync = (path, atime, mtime) => {
            this._utimes((0, util_2.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false);
        };
        this.lutimes = (path, atime, mtime, callback) => {
            this.wrapAsync(this._utimes, [(0, util_2.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false], callback);
        };
        this.mkdirSync = (path, options) => {
            const opts = (0, options_1.getMkdirOptions)(options);
            const modeNum = (0, util_2.modeToNumber)(opts.mode, 0o777);
            const filename = (0, util_2.pathToFilename)(path);
            if (opts.recursive)
                return this._core.mkdirp(filename, modeNum);
            this._core.mkdir(filename, modeNum);
        };
        this.mkdir = (path, a, b) => {
            const opts = (0, options_1.getMkdirOptions)(a);
            const callback = (0, util_2.validateCallback)(typeof a === 'function' ? a : b);
            const modeNum = (0, util_2.modeToNumber)(opts.mode, 0o777);
            const filename = (0, util_2.pathToFilename)(path);
            if (opts.recursive)
                this.wrapAsync(this._core.mkdirp, [filename, modeNum], callback);
            else
                this.wrapAsync(this._core.mkdir, [filename, modeNum], callback);
        };
        this._mkdtemp = (prefix, encoding, retry = 5) => {
            const filename = prefix + (0, util_2.genRndStr6)();
            try {
                this._core.mkdir(filename, 511 /* MODE.DIR */);
                return (0, encoding_1.strToEncoding)(filename, encoding);
            }
            catch (err) {
                if (err.code === "EEXIST" /* ERROR_CODE.EEXIST */) {
                    if (retry > 1)
                        return this._mkdtemp(prefix, encoding, retry - 1);
                    else
                        throw Error('Could not create temp dir.');
                }
                else
                    throw err;
            }
        };
        this.mkdtempSync = (prefix, options) => {
            const { encoding } = (0, options_1.getDefaultOpts)(options);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            (0, util_2.nullCheck)(prefix);
            return this._mkdtemp(prefix, encoding);
        };
        this.mkdtemp = (prefix, a, b) => {
            const [{ encoding }, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            if (!(0, util_2.nullCheck)(prefix))
                return;
            this.wrapAsync(this._mkdtemp, [prefix, encoding], callback);
        };
        this.rmdirSync = (path, options) => {
            const opts = (0, options_1.getRmdirOptions)(options);
            this._core.rmdir((0, util_2.pathToFilename)(path), opts.recursive);
        };
        this.rmdir = (path, a, b) => {
            const opts = (0, options_1.getRmdirOptions)(a);
            const callback = (0, util_2.validateCallback)(typeof a === 'function' ? a : b);
            this.wrapAsync(this._core.rmdir, [(0, util_2.pathToFilename)(path), opts.recursive], callback);
        };
        this.rmSync = (path, options) => {
            this._core.rm((0, util_2.pathToFilename)(path), options?.force, options?.recursive);
        };
        this.rm = (path, a, b) => {
            const [opts, callback] = (0, options_1.getRmOptsAndCb)(a, b);
            this.wrapAsync(this._core.rm, [(0, util_2.pathToFilename)(path), opts?.force, opts?.recursive], callback);
        };
        this._fchmod = (fd, modeNum) => {
            const file = this._core.getFileByFdOrThrow(fd, 'fchmod');
            file.chmod(modeNum);
        };
        this.fchmodSync = (fd, mode) => {
            this._fchmod(fd, (0, util_2.modeToNumber)(mode));
        };
        this.fchmod = (fd, mode, callback) => {
            this.wrapAsync(this._fchmod, [fd, (0, util_2.modeToNumber)(mode)], callback);
        };
        this._chmod = (filename, modeNum, followSymlinks = true) => {
            const link = followSymlinks
                ? this._core.getResolvedLinkOrThrow(filename, 'chmod')
                : this._core.getLinkOrThrow(filename, 'chmod');
            const node = link.getNode();
            node.chmod(modeNum);
        };
        this.chmodSync = (path, mode) => {
            const modeNum = (0, util_2.modeToNumber)(mode);
            const filename = (0, util_2.pathToFilename)(path);
            this._chmod(filename, modeNum, true);
        };
        this.chmod = (path, mode, callback) => {
            const modeNum = (0, util_2.modeToNumber)(mode);
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._chmod, [filename, modeNum], callback);
        };
        this._lchmod = (filename, modeNum) => {
            this._chmod(filename, modeNum, false);
        };
        this.lchmodSync = (path, mode) => {
            const modeNum = (0, util_2.modeToNumber)(mode);
            const filename = (0, util_2.pathToFilename)(path);
            this._lchmod(filename, modeNum);
        };
        this.lchmod = (path, mode, callback) => {
            const modeNum = (0, util_2.modeToNumber)(mode);
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._lchmod, [filename, modeNum], callback);
        };
        this._fchown = (fd, uid, gid) => {
            this._core.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
        };
        this.fchownSync = (fd, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._fchown(fd, uid, gid);
        };
        this.fchown = (fd, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._fchown, [fd, uid, gid], callback);
        };
        this._chown = (filename, uid, gid) => {
            const link = this._core.getResolvedLinkOrThrow(filename, 'chown');
            const node = link.getNode();
            node.chown(uid, gid);
        };
        this.chownSync = (path, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._chown((0, util_2.pathToFilename)(path), uid, gid);
        };
        this.chown = (path, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._chown, [(0, util_2.pathToFilename)(path), uid, gid], callback);
        };
        this._lchown = (filename, uid, gid) => {
            this._core.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
        };
        this.lchownSync = (path, uid, gid) => {
            validateUid(uid);
            validateGid(gid);
            this._lchown((0, util_2.pathToFilename)(path), uid, gid);
        };
        this.lchown = (path, uid, gid, callback) => {
            validateUid(uid);
            validateGid(gid);
            this.wrapAsync(this._lchown, [(0, util_2.pathToFilename)(path), uid, gid], callback);
        };
        this.statWatchers = {};
        this.cpSync = (src, dest, options) => {
            const srcFilename = (0, util_2.pathToFilename)(src);
            const destFilename = (0, util_2.pathToFilename)(dest);
            const opts_ = {
                dereference: options?.dereference ?? false,
                errorOnExist: options?.errorOnExist ?? false,
                filter: options?.filter,
                force: options?.force ?? true,
                mode: options?.mode ?? 0,
                preserveTimestamps: options?.preserveTimestamps ?? false,
                recursive: options?.recursive ?? false,
                verbatimSymlinks: options?.verbatimSymlinks ?? false,
            };
            return this._cp(srcFilename, destFilename, opts_);
        };
        this.cp = (src, dest, a, b) => {
            const srcFilename = (0, util_2.pathToFilename)(src);
            const destFilename = (0, util_2.pathToFilename)(dest);
            let options;
            let callback;
            if (typeof a === 'function')
                [options, callback] = [{}, a];
            else
                [options, callback] = [a || {}, b];
            (0, util_2.validateCallback)(callback);
            const opts_ = {
                dereference: options?.dereference ?? false,
                errorOnExist: options?.errorOnExist ?? false,
                filter: options?.filter,
                force: options?.force ?? true,
                mode: options?.mode ?? 0,
                preserveTimestamps: options?.preserveTimestamps ?? false,
                recursive: options?.recursive ?? false,
                verbatimSymlinks: options?.verbatimSymlinks ?? false,
            };
            this.wrapAsync(this._cp, [srcFilename, destFilename, opts_], callback);
        };
        this.openAsBlob = async (path, options) => {
            const filename = (0, util_2.pathToFilename)(path);
            const link = this._core.getResolvedLinkOrThrow(filename, 'open');
            const node = link.getNode();
            if (node.isDirectory())
                throw (0, util_2.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
            const buffer = node.getBuffer();
            const type = options?.type || '';
            return new Blob([buffer], { type });
        };
        this.glob = (pattern, ...args) => {
            const [options, callback] = args.length === 1 ? [{}, args[0]] : [args[0], args[1]];
            this.wrapAsync(this._globSync, [pattern, options || {}], callback);
        };
        this.globSync = (pattern, options = {}) => {
            return this._globSync(pattern, options);
        };
        this._globSync = (pattern, options = {}) => {
            const { globSync } = require('./glob');
            return globSync(this, pattern, options);
        };
        this._opendir = (filename, options) => {
            const link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
            const node = link.getNode();
            if (!node.isDirectory())
                throw (0, util_2.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'scandir', filename);
            return new Dir_1.Dir(link, options);
        };
        this.opendirSync = (path, options) => {
            const opts = (0, options_1.getOpendirOptions)(options);
            const filename = (0, util_2.pathToFilename)(path);
            return this._opendir(filename, opts);
        };
        this.opendir = (path, a, b) => {
            const [options, callback] = (0, options_1.getOpendirOptsAndCb)(a, b);
            const filename = (0, util_2.pathToFilename)(path);
            this.wrapAsync(this._opendir, [filename, options], callback);
        };
        const self = this; // tslint:disable-line no-this-assignment
        this.StatWatcher = class extends StatWatcher {
            constructor() {
                super(self);
            }
        };
        const _ReadStream = FsReadStream;
        this.ReadStream = class extends _ReadStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        const _WriteStream = FsWriteStream;
        this.WriteStream = class extends _WriteStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        this.FSWatcher = class extends FSWatcher {
            constructor() {
                super(self);
            }
        };
        const _realpath = (filename, encoding) => {
            const realLink = this._core.getResolvedLinkOrThrow(filename, 'realpath');
            return (0, encoding_1.strToEncoding)(realLink.getPath() || '/', encoding);
        };
        const realpathImpl = (path, a, b) => {
            const [opts, callback] = (0, options_1.getRealpathOptsAndCb)(a, b);
            const pathFilename = (0, util_2.pathToFilename)(path);
            self.wrapAsync(_realpath, [pathFilename, opts.encoding], callback);
        };
        const realpathSyncImpl = (path, options) => _realpath((0, util_2.pathToFilename)(path), (0, options_1.getRealpathOptions)(options).encoding);
        this.realpath = realpathImpl;
        this.realpath.native = realpathImpl;
        this.realpathSync = realpathSyncImpl;
        this.realpathSync.native = realpathSyncImpl;
    }
    wrapAsync(method, args, callback) {
        (0, util_2.validateCallback)(callback);
        Promise.resolve().then(() => {
            let result;
            try {
                result = method.apply(this, args);
            }
            catch (err) {
                callback(err);
                return;
            }
            callback(null, result);
        });
    }
    toTree(opts = { separator: path_1.sep }) {
        return (0, print_1.toTreeSync)(this, opts);
    }
    reset() {
        this._core.reset();
    }
    toJSON(paths, json = {}, isRelative = false, asBuffer = false) {
        return this._core.toJSON(paths, json, isRelative, asBuffer);
    }
    fromJSON(json, cwd) {
        return this._core.fromJSON(json, cwd);
    }
    fromNestedJSON(json, cwd) {
        return this._core.fromNestedJSON(json, cwd);
    }
    // Legacy interface
    mountSync(mountpoint, json) {
        this._core.fromJSON(json, mountpoint);
    }
    _write(fd, buf, offset, length, position) {
        const file = this._core.getFileByFdOrThrow(fd, 'write');
        if (file.node.isSymlink()) {
            throw (0, util_2.createError)("EBADF" /* ERROR_CODE.EBADF */, 'write', file.link.getPath());
        }
        return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
    }
    writevBase(fd, buffers, position) {
        const file = this._core.getFileByFdOrThrow(fd);
        let p = position ?? undefined;
        if (p === -1) {
            p = undefined;
        }
        let bytesWritten = 0;
        for (const buffer of buffers) {
            const nodeBuf = buffer_1.Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const bytes = file.write(nodeBuf, 0, nodeBuf.byteLength, p);
            p = undefined;
            bytesWritten += bytes;
            if (bytes < nodeBuf.byteLength)
                break;
        }
        return bytesWritten;
    }
    _copyFile(src, dest, flags) {
        const buf = this.readFileSync(src);
        if (flags & COPYFILE_EXCL && this.existsSync(dest))
            throw (0, util_2.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'copyFile', src, dest);
        if (flags & COPYFILE_FICLONE_FORCE)
            throw (0, util_2.createError)("ENOSYS" /* ERROR_CODE.ENOSYS */, 'copyFile', src, dest);
        this._core.writeFile(dest, buf, constants_2.FLAGS.w, 438 /* MODE.DEFAULT */);
    }
    isSrcSubdir(src, dest) {
        try {
            const normalizedSrc = pathNormalize(src.startsWith('/') ? src : '/' + src);
            const normalizedDest = pathNormalize(dest.startsWith('/') ? dest : '/' + dest);
            if (normalizedSrc === normalizedDest)
                return true;
            // Check if dest is under src by using relative path
            // If dest is under src, the relative path from src to dest won't start with '..'
            const relativePath = pathRelative(normalizedSrc, normalizedDest);
            // If relative path is empty or doesn't start with '..', dest is under src
            return relativePath === '' || (!relativePath.startsWith('..') && !(0, path_1.isAbsolute)(relativePath));
        }
        catch (error) {
            // If path operations fail, assume it's safe (don't block the copy)
            return false;
        }
    }
    cpFileSync(srcStat, destStat, src, dest, options) {
        if (destStat) {
            if (options.errorOnExist)
                throw (0, util_2.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'cp', dest);
            if (!options.force)
                return;
            this.unlinkSync(dest);
        }
        // Copy the file
        this.copyFileSync(src, dest, options.mode);
        // Preserve timestamps if requested
        if (options.preserveTimestamps)
            this.utimesSync(dest, srcStat.atime, srcStat.mtime);
        // Set file mode
        this.chmodSync(dest, Number(srcStat.mode));
    }
    cpDirSync(srcStat, destStat, src, dest, options) {
        if (!destStat) {
            this.mkdirSync(dest);
        }
        // Read directory contents
        const entries = this.readdirSync(src);
        for (const entry of entries) {
            const srcItem = pathJoin(src, String(entry));
            const destItem = pathJoin(dest, String(entry));
            // Apply filter to each item
            if (options.filter && !options.filter(srcItem, destItem)) {
                continue;
            }
            this._cp(srcItem, destItem, options);
        }
        // Set directory mode
        this.chmodSync(dest, Number(srcStat.mode));
    }
    cpSymlinkSync(destStat, src, dest, options) {
        let linkTarget = String(this.readlinkSync(src));
        if (!options.verbatimSymlinks && !(0, path_1.isAbsolute)(linkTarget))
            linkTarget = resolveCrossPlatform(pathDirname(src), linkTarget);
        if (destStat)
            this.unlinkSync(dest);
        this.symlinkSync(linkTarget, dest);
    }
    lstat(path, a, b) {
        const [{ throwIfNoEntry = true, bigint = false }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this._lstat, [(0, util_2.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    _stat(filename, bigint = false, throwIfNoEntry = true) {
        let link;
        try {
            link = this._core.getResolvedLinkOrThrow(filename, 'stat');
        }
        catch (err) {
            if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && !throwIfNoEntry)
                return undefined;
            else
                throw err;
        }
        return Stats_1.default.build(link.getNode(), bigint);
    }
    statSync(path, options) {
        const { bigint = true, throwIfNoEntry = true } = (0, options_1.getStatOptions)(options);
        return this._stat((0, util_2.pathToFilename)(path), bigint, throwIfNoEntry);
    }
    stat(path, a, b) {
        const [{ bigint = false, throwIfNoEntry = true }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this._stat, [(0, util_2.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    fstatBase(fd, bigint = false) {
        const file = this._core.getFileByFd(fd);
        if (!file)
            throw (0, util_2.createError)("EBADF" /* ERROR_CODE.EBADF */, 'fstat');
        return Stats_1.default.build(file.node, bigint);
    }
    fstatSync(fd, options) {
        return this.fstatBase(fd, (0, options_1.getStatOptions)(options).bigint);
    }
    fstat(fd, a, b) {
        const [opts, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
    }
    _exists(filename) {
        return !!this._stat(filename);
    }
    _access(filename, mode) {
        const link = this._core.getLinkOrThrow(filename, 'access');
        const node = link.getNode();
        // F_OK (0) just checks for existence, which we already confirmed above
        if (mode === F_OK) {
            return;
        }
        // Check read permission
        if (mode & R_OK && !node.canRead()) {
            throw (0, util_2.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
        // Check write permission
        if (mode & W_OK && !node.canWrite()) {
            throw (0, util_2.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
        // Check execute permission
        if (mode & X_OK && !node.canExecute()) {
            throw (0, util_2.createError)("EACCES" /* ERROR_CODE.EACCES */, 'access', filename);
        }
    }
    watchFile(path, a, b) {
        const filename = (0, util_2.pathToFilename)(path);
        let options = a;
        let listener = b;
        if (typeof options === 'function') {
            listener = a;
            options = null;
        }
        if (typeof listener !== 'function') {
            throw Error('"watchFile()" requires a listener function');
        }
        let interval = 5007;
        let persistent = true;
        if (options && typeof options === 'object') {
            if (typeof options.interval === 'number')
                interval = options.interval;
            if (typeof options.persistent === 'boolean')
                persistent = options.persistent;
        }
        let watcher = this.statWatchers[filename];
        if (!watcher) {
            watcher = new this.StatWatcher();
            watcher.start(filename, persistent, interval);
            this.statWatchers[filename] = watcher;
        }
        watcher.addListener('change', listener);
        return watcher;
    }
    unwatchFile(path, listener) {
        const filename = (0, util_2.pathToFilename)(path);
        const watcher = this.statWatchers[filename];
        if (!watcher)
            return;
        if (typeof listener === 'function') {
            watcher.removeListener('change', listener);
        }
        else {
            watcher.removeAllListeners('change');
        }
        if (watcher.listenerCount('change') === 0) {
            watcher.stop();
            delete this.statWatchers[filename];
        }
    }
    createReadStream(path, options) {
        return new this.ReadStream(path, options);
    }
    createWriteStream(path, options) {
        return new this.WriteStream(path, options);
    }
    // watch(path: PathLike): FSWatcher;
    // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
    watch(path, options, listener) {
        const filename = (0, util_2.pathToFilename)(path);
        let givenOptions = options;
        if (typeof options === 'function') {
            listener = options;
            givenOptions = null;
        }
        // tslint:disable-next-line prefer-const
        let { persistent, recursive, encoding } = (0, options_1.getDefaultOpts)(givenOptions);
        if (persistent === undefined)
            persistent = true;
        if (recursive === undefined)
            recursive = false;
        const watcher = new this.FSWatcher();
        watcher.start(filename, persistent, recursive, encoding);
        if (listener) {
            watcher.addListener('change', listener);
        }
        return watcher;
    }
    _statfs(filename, bigint = false) {
        // Verify the path exists to match Node.js behavior
        this._core.getResolvedLinkOrThrow(filename, 'statfs');
        return StatFs_1.default.build(this._core, bigint);
    }
    statfsSync(path, options) {
        const { bigint = false } = (0, options_1.getStatfsOptions)(options);
        return this._statfs((0, util_2.pathToFilename)(path), bigint);
    }
    statfs(path, a, b) {
        const [{ bigint = false }, callback] = (0, options_1.getStatfsOptsAndCb)(a, b);
        this.wrapAsync(this._statfs, [(0, util_2.pathToFilename)(path), bigint], callback);
    }
}
exports.Volume = Volume;
Volume.fromJSON = (json, cwd) => new Volume(core_1.Superblock.fromJSON(json, cwd));
Volume.fromNestedJSON = (json, cwd) => new Volume(core_1.Superblock.fromNestedJSON(json, cwd));
function emitStop(self) {
    self.emit('stop');
}
class StatWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this.onInterval = () => {
            try {
                const stats = this.vol.statSync(this.filename);
                if (this.hasChanged(stats)) {
                    this.emit('change', stats, this.prev);
                    this.prev = stats;
                }
            }
            finally {
                this.loop();
            }
        };
        this.vol = vol;
    }
    loop() {
        this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
    }
    hasChanged(stats) {
        // if(!this.prev) return false;
        if (stats.mtimeMs > this.prev.mtimeMs)
            return true;
        if (stats.nlink !== this.prev.nlink)
            return true;
        return false;
    }
    start(path, persistent = true, interval = 5007) {
        this.filename = (0, util_2.pathToFilename)(path);
        this.setTimeout = persistent
            ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global)
            : setTimeoutUnref_1.default;
        this.interval = interval;
        this.prev = this.vol.statSync(this.filename);
        this.loop();
    }
    stop() {
        clearTimeout(this.timeoutRef);
        (0, queueMicrotask_1.default)(() => {
            emitStop.call(this, this);
        });
    }
}
exports.StatWatcher = StatWatcher;
/* tslint:disable no-var-keyword prefer-const */
// ---------------------------------------- ReadStream
var pool;
function allocNewPool(poolSize) {
    pool = (0, buffer_1.bufferAllocUnsafe)(poolSize);
    pool.used = 0;
}
(0, util_1.inherits)(FsReadStream, stream_1.Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
    if (!(this instanceof FsReadStream))
        return new FsReadStream(vol, path, options);
    this._vol = vol;
    // a little bit bigger buffer and water marks by default
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    if (options.highWaterMark === undefined)
        options.highWaterMark = 64 * 1024;
    stream_1.Readable.call(this, options);
    this.path = (0, util_2.pathToFilename)(path);
    this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
    this.flags = options.flags === undefined ? 'r' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;
    this.start = options.start;
    this.end = options.end;
    this.autoClose = options.autoClose === undefined ? true : options.autoClose;
    this.pos = undefined;
    this.bytesRead = 0;
    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.end === undefined) {
            this.end = Infinity;
        }
        else if (typeof this.end !== 'number') {
            throw new TypeError('"end" option must be a Number');
        }
        if (this.start > this.end) {
            throw new Error('"start" option must be <= "end" option');
        }
        this.pos = this.start;
    }
    if (typeof this.fd !== 'number')
        this.open();
    this.on('end', function () {
        if (this.autoClose) {
            if (this.destroy)
                this.destroy();
        }
    });
}
FsReadStream.prototype.open = function () {
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
        if (er) {
            if (self.autoClose) {
                if (self.destroy)
                    self.destroy();
            }
            self.emit('error', er);
            return;
        }
        self.fd = fd;
        self.emit('open', fd);
        // start the flow of data.
        self.read();
    });
};
FsReadStream.prototype._read = function (n) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._read(n);
        });
    }
    if (this.destroyed)
        return;
    if (!pool || pool.length - pool.used < kMinPoolSpace) {
        // discard the old pool.
        allocNewPool(this._readableState.highWaterMark);
    }
    // Grab another reference to the pool in the case that while we're
    // in the thread pool another read() finishes up the pool, and
    // allocates a new one.
    var thisPool = pool;
    var toRead = Math.min(pool.length - pool.used, n);
    var start = pool.used;
    if (this.pos !== undefined)
        toRead = Math.min(this.end - this.pos + 1, toRead);
    // already read everything we were supposed to read!
    // treat as EOF.
    if (toRead <= 0)
        return this.push(null);
    // the actual read.
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);
    // move the pool positions, and internal position for reading.
    if (this.pos !== undefined)
        this.pos += toRead;
    pool.used += toRead;
    function onread(er, bytesRead) {
        if (er) {
            if (self.autoClose && self.destroy) {
                self.destroy();
            }
            self.emit('error', er);
        }
        else {
            var b = null;
            if (bytesRead > 0) {
                self.bytesRead += bytesRead;
                b = thisPool.slice(start, start + bytesRead);
            }
            self.push(b);
        }
    }
};
FsReadStream.prototype._destroy = function (err, cb) {
    this.close(err2 => {
        cb(err || err2);
    });
};
FsReadStream.prototype.close = function (cb) {
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Readable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
    if (typeof this._readableState?.closed === 'boolean') {
        this._readableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });
    this.fd = null;
};
// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen(fd) {
    this.close();
}
(0, util_1.inherits)(FsWriteStream, stream_1.Writable);
exports.WriteStream = FsWriteStream;
function FsWriteStream(vol, path, options) {
    if (!(this instanceof FsWriteStream))
        return new FsWriteStream(vol, path, options);
    this._vol = vol;
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    stream_1.Writable.call(this, options);
    this.path = (0, util_2.pathToFilename)(path);
    this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
    this.flags = options.flags === undefined ? 'w' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;
    this.start = options.start;
    this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
    this.pos = undefined;
    this.bytesWritten = 0;
    this.pending = true;
    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.start < 0) {
            throw new Error('"start" must be >= zero');
        }
        this.pos = this.start;
    }
    if (options.encoding)
        this.setDefaultEncoding(options.encoding);
    if (typeof this.fd !== 'number')
        this.open();
    // dispose on finish.
    this.once('finish', function () {
        if (this.autoClose) {
            this.close();
        }
    });
}
FsWriteStream.prototype.open = function () {
    this._vol.open(this.path, this.flags, this.mode, function (er, fd) {
        if (er) {
            if (this.autoClose && this.destroy) {
                this.destroy();
            }
            this.emit('error', er);
            return;
        }
        this.fd = fd;
        this.pending = false;
        this.emit('open', fd);
    }.bind(this));
};
FsWriteStream.prototype._write = function (data, encoding, cb) {
    if (!(data instanceof buffer_1.Buffer || data instanceof Uint8Array))
        return this.emit('error', new Error('Invalid data'));
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._write(data, encoding, cb);
        });
    }
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.autoClose && self.destroy) {
                self.destroy();
            }
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });
    if (this.pos !== undefined)
        this.pos += data.length;
};
FsWriteStream.prototype._writev = function (data, cb) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._writev(data, cb);
        });
    }
    const self = this; // tslint:disable-line no-this-assignment
    const len = data.length;
    const chunks = new Array(len);
    var size = 0;
    for (var i = 0; i < len; i++) {
        var chunk = data[i].chunk;
        chunks[i] = chunk;
        size += chunk.length;
    }
    const buf = buffer_1.Buffer.concat(chunks);
    this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.destroy)
                self.destroy();
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });
    if (this.pos !== undefined)
        this.pos += size;
};
FsWriteStream.prototype.close = function (cb) {
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Writable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
    if (typeof this._writableState?.closed === 'boolean') {
        this._writableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });
    this.fd = null;
};
FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;
// There is no shutdown() for files.
FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;
// ---------------------------------------- FSWatcher
class FSWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this._filename = '';
        this._filenameEncoded = '';
        // _persistent: boolean = true;
        this._recursive = false;
        this._encoding = encoding_1.ENCODING_UTF8;
        // inode -> removers
        this._listenerRemovers = new Map();
        this._onParentChild = (link) => {
            if (link.getName() === this._getName()) {
                this._emit('rename');
            }
        };
        this._emit = (type) => {
            this.emit('change', type, this._filenameEncoded);
        };
        this._persist = () => {
            this._timer = setTimeout(this._persist, 1e6);
        };
        this._vol = vol;
        // TODO: Emit "error" messages when watching.
        // this._handle.onchange = function(status, eventType, filename) {
        //     if (status < 0) {
        //         self._handle.close();
        //         const error = !filename ?
        //             errnoException(status, 'Error watching file for changes:') :
        //             errnoException(status, `Error watching file ${filename} for changes:`);
        //         error.filename = filename;
        //         self.emit('error', error);
        //     } else {
        //         self.emit('change', eventType, filename);
        //     }
        // };
    }
    _getName() {
        return this._steps[this._steps.length - 1];
    }
    start(path, persistent = true, recursive = false, encoding = encoding_1.ENCODING_UTF8) {
        this._filename = (0, util_2.pathToFilename)(path);
        this._steps = (0, util_3.filenameToSteps)(this._filename);
        this._filenameEncoded = (0, encoding_1.strToEncoding)(this._filename);
        // this._persistent = persistent;
        this._recursive = recursive;
        this._encoding = encoding;
        try {
            this._link = this._vol._core.getLinkOrThrow(this._filename, 'FSWatcher');
        }
        catch (err) {
            const error = new Error(`watch ${this._filename} ${err.code}`);
            error.code = err.code;
            error.errno = err.code;
            throw error;
        }
        const watchLinkNodeChanged = (link) => {
            const filepath = link.getPath();
            const node = link.getNode();
            const onNodeChange = () => {
                let filename = pathRelative(this._filename, filepath);
                if (!filename)
                    filename = this._getName();
                return this.emit('change', 'change', filename);
            };
            const unsub = node.changes.listen(([type]) => {
                if (type === 'modify')
                    onNodeChange();
            });
            const removers = this._listenerRemovers.get(node.ino) ?? [];
            removers.push(() => unsub());
            this._listenerRemovers.set(node.ino, removers);
        };
        const watchLinkChildrenChanged = (link) => {
            const node = link.getNode();
            // when a new link added
            const onLinkChildAdd = (l) => {
                this.emit('change', 'rename', pathRelative(this._filename, l.getPath()));
                // 1. watch changes of the new link-node
                watchLinkNodeChanged(l);
                // 2. watch changes of the new link-node's children
                watchLinkChildrenChanged(l);
            };
            // when a new link deleted
            const onLinkChildDelete = (l) => {
                // remove the listeners of the children nodes
                const removeLinkNodeListeners = (curLink) => {
                    const ino = curLink.getNode().ino;
                    const removers = this._listenerRemovers.get(ino);
                    if (removers) {
                        removers.forEach(r => r());
                        this._listenerRemovers.delete(ino);
                    }
                    for (const [name, childLink] of curLink.children.entries()) {
                        if (childLink && name !== '.' && name !== '..') {
                            removeLinkNodeListeners(childLink);
                        }
                    }
                };
                removeLinkNodeListeners(l);
                this.emit('change', 'rename', pathRelative(this._filename, l.getPath()));
            };
            // children nodes changed
            for (const [name, childLink] of link.children.entries()) {
                if (childLink && name !== '.' && name !== '..') {
                    watchLinkNodeChanged(childLink);
                }
            }
            // link children add/remove
            const unsubscribeLinkChanges = link.changes.listen(([type, link]) => {
                if (type === 'child:add')
                    onLinkChildAdd(link);
                else if (type === 'child:del')
                    onLinkChildDelete(link);
            });
            const removers = this._listenerRemovers.get(node.ino) ?? [];
            removers.push(() => {
                unsubscribeLinkChanges();
            });
            if (recursive) {
                for (const [name, childLink] of link.children.entries()) {
                    if (childLink && name !== '.' && name !== '..') {
                        watchLinkChildrenChanged(childLink);
                    }
                }
            }
        };
        watchLinkNodeChanged(this._link);
        watchLinkChildrenChanged(this._link);
        const parent = this._link.parent;
        if (parent) {
            // parent.on('child:delete', this._onParentChild);
            parent.changes.listen(([type, link]) => {
                if (type === 'child:del')
                    this._onParentChild(link);
            });
        }
        if (persistent)
            this._persist();
    }
    close() {
        clearTimeout(this._timer);
        this._listenerRemovers.forEach(removers => {
            removers.forEach(r => r());
        });
        this._listenerRemovers.clear();
        this._parentChangesUnsub?.();
    }
}
exports.FSWatcher = FSWatcher;
//# sourceMappingURL=volume.js.map