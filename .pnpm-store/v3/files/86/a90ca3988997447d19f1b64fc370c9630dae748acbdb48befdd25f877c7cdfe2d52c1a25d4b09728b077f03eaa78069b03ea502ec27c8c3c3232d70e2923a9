"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Superblock = void 0;
const path_1 = require("../vendor/node/path");
const Node_1 = require("./Node");
const Link_1 = require("./Link");
const File_1 = require("./File");
const buffer_1 = require("../vendor/node/internal/buffer");
const process_1 = require("../process");
const constants_1 = require("../constants");
const constants_2 = require("../node/constants");
const util_1 = require("../node/util");
const util_2 = require("./util");
const json_1 = require("./json");
const pathSep = path_1.posix ? path_1.posix.sep : path_1.sep;
const pathRelative = path_1.posix ? path_1.posix.relative : path_1.relative;
const pathJoin = path_1.posix ? path_1.posix.join : path_1.join;
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY } = constants_1.constants;
/**
 * Represents a filesystem superblock, which is the root of a virtual
 * filesystem in Linux.
 * @see https://lxr.linux.no/linux+v3.11.2/include/linux/fs.h#L1242
 */
class Superblock {
    static fromJSON(json, cwd) {
        const vol = new Superblock();
        vol.fromJSON(json, cwd);
        return vol;
    }
    static fromNestedJSON(json, cwd) {
        const vol = new Superblock();
        vol.fromNestedJSON(json, cwd);
        return vol;
    }
    constructor(props = {}) {
        // I-node number counter.
        this.ino = 0;
        // A mapping for i-node numbers to i-nodes (`Node`);
        this.inodes = {};
        // List of released i-node numbers, for reuse.
        this.releasedInos = [];
        // A mapping for file descriptors to `File`s.
        this.fds = {};
        // A list of reusable (opened and closed) file descriptors, that should be
        // used first before creating a new file descriptor.
        this.releasedFds = [];
        // Max number of open files.
        this.maxFiles = 10000;
        // Current number of open files.
        this.openFiles = 0;
        this.open = (filename, flagsNum, modeNum, resolveSymlinks = true) => {
            const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
            if (!file)
                throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, 'open', filename);
            return file.fd;
        };
        this.writeFile = (id, buf, flagsNum, modeNum) => {
            const isUserFd = typeof id === 'number';
            let fd;
            if (isUserFd)
                fd = id;
            else
                fd = this.open((0, util_1.pathToFilename)(id), flagsNum, modeNum);
            let offset = 0;
            let length = buf.length;
            let position = flagsNum & O_APPEND ? undefined : 0;
            try {
                while (length > 0) {
                    const written = this.write(fd, buf, offset, length, position);
                    offset += written;
                    length -= written;
                    if (position !== undefined)
                        position += written;
                }
            }
            finally {
                if (!isUserFd)
                    this.close(fd);
            }
        };
        this.read = (fd, buffer, offset, length, position) => {
            if (buffer.byteLength < length) {
                throw (0, util_1.createError)("ERR_OUT_OF_RANGE" /* ERROR_CODE.ERR_OUT_OF_RANGE */, 'read', undefined, undefined, RangeError);
            }
            const file = this.getFileByFdOrThrow(fd);
            if (file.node.isSymlink()) {
                throw (0, util_1.createError)("EPERM" /* ERROR_CODE.EPERM */, 'read', file.link.getPath());
            }
            return file.read(buffer, Number(offset), Number(length), position === -1 || typeof position !== 'number' ? undefined : position);
        };
        this.readv = (fd, buffers, position) => {
            const file = this.getFileByFdOrThrow(fd);
            let p = position ?? undefined;
            if (p === -1)
                p = undefined;
            let bytesRead = 0;
            for (const buffer of buffers) {
                const bytes = file.read(buffer, 0, buffer.byteLength, p);
                p = undefined;
                bytesRead += bytes;
                if (bytes < buffer.byteLength)
                    break;
            }
            return bytesRead;
        };
        this.link = (filename1, filename2) => {
            let link1;
            try {
                link1 = this.getLinkOrThrow(filename1, 'link');
            }
            catch (err) {
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'link', filename1, filename2);
                throw err;
            }
            const dirname2 = (0, path_1.dirname)(filename2);
            let dir2;
            try {
                dir2 = this.getLinkOrThrow(dirname2, 'link');
            }
            catch (err) {
                // Augment error with filename1
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'link', filename1, filename2);
                throw err;
            }
            const name = (0, path_1.basename)(filename2);
            if (dir2.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'link', filename1, filename2);
            const node = link1.getNode();
            node.nlink++;
            dir2.createChild(name, node);
        };
        this.unlink = (filename) => {
            const link = this.getLinkOrThrow(filename, 'unlink');
            // TODO: Check if it is file, dir, other...
            if (link.length)
                throw Error('Dir not empty...');
            this.deleteLink(link);
            const node = link.getNode();
            node.nlink--;
            // When all hard links to i-node are deleted, remove the i-node, too.
            if (node.nlink <= 0) {
                this.deleteNode(node);
            }
        };
        this.symlink = (targetFilename, pathFilename) => {
            const pathSteps = (0, util_2.filenameToSteps)(pathFilename);
            // Check if directory exists, where we about to create a symlink.
            let dirLink;
            try {
                dirLink = this.getLinkParentAsDirOrThrow(pathSteps);
            }
            catch (err) {
                // Catch error to populate with the correct fields - getLinkParentAsDirOrThrow won't be aware of the second path
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'symlink', targetFilename, pathFilename);
                throw err;
            }
            const name = pathSteps[pathSteps.length - 1];
            // Check if new file already exists.
            if (dirLink.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'symlink', targetFilename, pathFilename);
            // Check permissions on the path where we are creating the symlink.
            // Note we're not checking permissions on the target path: It is not an error to create a symlink to a
            // non-existent or inaccessible target
            const node = dirLink.getNode();
            if (!node.canExecute() || !node.canWrite())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'symlink', targetFilename, pathFilename);
            // Create symlink.
            const symlink = dirLink.createChild(name);
            symlink.getNode().makeSymlink(targetFilename);
            return symlink;
        };
        this.rename = (oldPathFilename, newPathFilename) => {
            let link;
            try {
                link = this.getResolvedLinkOrThrow(oldPathFilename);
            }
            catch (err) {
                // Augment err with newPathFilename
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'rename', oldPathFilename, newPathFilename);
                throw err;
            }
            // TODO: Check if it is directory, if non-empty, we cannot move it, right?
            // Check directory exists for the new location.
            let newPathDirLink;
            try {
                newPathDirLink = this.getLinkParentAsDirOrThrow(newPathFilename);
            }
            catch (err) {
                // Augment error with oldPathFilename
                if (err.code)
                    err = (0, util_1.createError)(err.code, 'rename', oldPathFilename, newPathFilename);
                throw err;
            }
            // TODO: Also treat cases with directories and symbolic links.
            // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html
            // Remove hard link from old folder.
            const oldLinkParent = link.parent;
            if (!oldLinkParent)
                throw (0, util_1.createError)("EINVAL" /* ERROR_CODE.EINVAL */, 'rename', oldPathFilename, newPathFilename);
            // Check we have access and write permissions in both places
            const oldParentNode = oldLinkParent.getNode();
            const newPathDirNode = newPathDirLink.getNode();
            if (!oldParentNode.canExecute() ||
                !oldParentNode.canWrite() ||
                !newPathDirNode.canExecute() ||
                !newPathDirNode.canWrite()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'rename', oldPathFilename, newPathFilename);
            }
            oldLinkParent.deleteChild(link);
            // Rename should overwrite the new path, if that exists.
            const name = (0, path_1.basename)(newPathFilename);
            link.name = name;
            link.steps = [...newPathDirLink.steps, name];
            newPathDirLink.setChild(link.getName(), link);
        };
        this.mkdir = (filename, modeNum) => {
            const steps = (0, util_2.filenameToSteps)(filename);
            // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
            if (!steps.length)
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'mkdir', filename);
            const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');
            // Check path already exists.
            const name = steps[steps.length - 1];
            if (dir.getChild(name))
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'mkdir', filename);
            const node = dir.getNode();
            if (!node.canWrite() || !node.canExecute())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'mkdir', filename);
            dir.createChild(name, this.createNode(constants_1.constants.S_IFDIR | modeNum));
        };
        /**
         * Creates directory tree recursively.
         */
        this.mkdirp = (filename, modeNum) => {
            let created = false;
            const steps = (0, util_2.filenameToSteps)(filename);
            let curr = null;
            let i = steps.length;
            // Find the longest subpath of filename that still exists:
            for (i = steps.length; i >= 0; i--) {
                curr = this.getResolvedLink(steps.slice(0, i));
                if (curr)
                    break;
            }
            if (!curr) {
                curr = this.root;
                i = 0;
            }
            // curr is now the last directory that still exists.
            // (If none of them existed, curr is the root.)
            // Check access the lazy way:
            curr = this.getResolvedLinkOrThrow(path_1.sep + steps.slice(0, i).join(path_1.sep), 'mkdir');
            // Start creating directories:
            for (i; i < steps.length; i++) {
                const node = curr.getNode();
                if (node.isDirectory()) {
                    // Check we have permissions
                    if (!node.canExecute() || !node.canWrite())
                        throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'mkdir', filename);
                }
                else {
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'mkdir', filename);
                }
                created = true;
                curr = curr.createChild(steps[i], this.createNode(constants_1.constants.S_IFDIR | modeNum));
            }
            return created ? filename : undefined;
        };
        this.rmdir = (filename, recursive = false) => {
            const link = this.getLinkAsDirOrThrow(filename, 'rmdir');
            if (link.length && !recursive)
                throw (0, util_1.createError)("ENOTEMPTY" /* ERROR_CODE.ENOTEMPTY */, 'rmdir', filename);
            this.deleteLink(link);
        };
        this.rm = (filename, force = false, recursive = false) => {
            // "stat" is used to match Node's native error message.
            let link;
            try {
                link = this.getResolvedLinkOrThrow(filename, 'stat');
            }
            catch (err) {
                // Silently ignore missing paths if force option is true
                if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && force)
                    return;
                else
                    throw err;
            }
            if (link.getNode().isDirectory() && !recursive)
                throw (0, util_1.createError)("ERR_FS_EISDIR" /* ERROR_CODE.ERR_FS_EISDIR */, 'rm', filename);
            if (!link.parent?.getNode().canWrite())
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'rm', filename);
            this.deleteLink(link);
        };
        this.close = (fd) => {
            (0, util_2.validateFd)(fd);
            const file = this.getFileByFdOrThrow(fd, 'close');
            this.closeFile(file);
        };
        const root = this.createLink();
        root.setNode(this.createNode(constants_1.constants.S_IFDIR | 0o777));
        root.setChild('.', root);
        root.getNode().nlink++;
        root.setChild('..', root);
        root.getNode().nlink++;
        this.root = root;
    }
    createLink(parent, name, isDirectory = false, mode) {
        if (!parent) {
            return new Link_1.Link(this, void 0, '');
        }
        if (!name) {
            throw new Error('createLink: name cannot be empty');
        }
        // If no explicit permission is provided, use defaults based on type
        const finalPerm = mode ?? (isDirectory ? 0o777 : 0o666);
        // To prevent making a breaking change, `mode` can also just be a permission number
        // and the file type is set based on `isDirectory`
        const hasFileType = mode && mode & constants_1.constants.S_IFMT;
        const modeType = hasFileType ? mode & constants_1.constants.S_IFMT : isDirectory ? constants_1.constants.S_IFDIR : constants_1.constants.S_IFREG;
        const finalMode = (finalPerm & ~constants_1.constants.S_IFMT) | modeType;
        return parent.createChild(name, this.createNode(finalMode));
    }
    deleteLink(link) {
        const parent = link.parent;
        if (parent) {
            parent.deleteChild(link);
            return true;
        }
        return false;
    }
    newInoNumber() {
        const releasedFd = this.releasedInos.pop();
        if (releasedFd)
            return releasedFd;
        else {
            this.ino = (this.ino + 1) % 0xffffffff;
            return this.ino;
        }
    }
    newFdNumber() {
        const releasedFd = this.releasedFds.pop();
        return typeof releasedFd === 'number' ? releasedFd : Superblock.fd--;
    }
    createNode(mode) {
        const node = new Node_1.Node(this.newInoNumber(), mode);
        this.inodes[node.ino] = node;
        return node;
    }
    deleteNode(node) {
        node.del();
        delete this.inodes[node.ino];
        this.releasedInos.push(node.ino);
    }
    walk(stepsOrFilenameOrLink, resolveSymlinks = false, checkExistence = false, checkAccess = false, funcName) {
        let steps;
        let filename;
        if (stepsOrFilenameOrLink instanceof Link_1.Link) {
            steps = stepsOrFilenameOrLink.steps;
            filename = pathSep + steps.join(pathSep);
        }
        else if (typeof stepsOrFilenameOrLink === 'string') {
            steps = (0, util_2.filenameToSteps)(stepsOrFilenameOrLink);
            filename = stepsOrFilenameOrLink;
        }
        else {
            steps = stepsOrFilenameOrLink;
            filename = pathSep + steps.join(pathSep);
        }
        let curr = this.root;
        let i = 0;
        while (i < steps.length) {
            let node = curr.getNode();
            // Check access permissions if current link is a directory
            if (node.isDirectory()) {
                if (checkAccess && !node.canExecute()) {
                    throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, funcName, filename);
                }
            }
            else {
                if (i < steps.length - 1)
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
            }
            curr = curr.getChild(steps[i]) ?? null;
            // Check existence of current link
            if (!curr)
                if (checkExistence)
                    throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, funcName, filename);
                else
                    return null;
            node = curr?.getNode();
            // Resolve symlink if we're resolving all symlinks OR if this is an intermediate path component
            // This allows lstat to traverse through symlinks in intermediate directories while not resolving the final component
            if (node.isSymlink() && (resolveSymlinks || i < steps.length - 1)) {
                const resolvedPath = (0, path_1.isAbsolute)(node.symlink) ? node.symlink : pathJoin((0, path_1.dirname)(curr.getPath()), node.symlink); // Relative to symlink's parent
                steps = (0, util_2.filenameToSteps)(resolvedPath).concat(steps.slice(i + 1));
                curr = this.root;
                i = 0;
                continue;
            }
            // After resolving symlinks, check if it's not a directory and we still have more steps
            // This handles the case where we try to traverse through a file
            // Only do this check when we're doing filesystem operations (checkExistence = true)
            if (checkExistence && !node.isDirectory() && i < steps.length - 1) {
                // On Windows, use ENOENT for consistency with Node.js behavior
                // On other platforms, use ENOTDIR which is more semantically correct
                const errorCode = process_1.default.platform === 'win32' ? "ENOENT" /* ERROR_CODE.ENOENT */ : "ENOTDIR" /* ERROR_CODE.ENOTDIR */;
                throw (0, util_1.createError)(errorCode, funcName, filename);
            }
            i++;
        }
        return curr;
    }
    // Returns a `Link` (hard link) referenced by path "split" into steps.
    getLink(steps) {
        return this.walk(steps, false, false, false);
    }
    // Just link `getLink`, but throws a correct user error, if link to found.
    getLinkOrThrow(filename, funcName) {
        return this.walk(filename, false, true, true, funcName);
    }
    // Just like `getLink`, but also dereference/resolves symbolic links.
    getResolvedLink(filenameOrSteps) {
        return this.walk(filenameOrSteps, true, false, false);
    }
    /**
     * Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
     */
    getResolvedLinkOrThrow(filename, funcName) {
        return this.walk(filename, true, true, true, funcName);
    }
    resolveSymlinks(link) {
        return this.getResolvedLink(link.steps.slice(1));
    }
    /**
     * Just like `getLinkOrThrow`, but also verifies that the link is a directory.
     */
    getLinkAsDirOrThrow(filename, funcName) {
        const link = this.getLinkOrThrow(filename, funcName);
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
        return link;
    }
    // Get the immediate parent directory of the link.
    getLinkParent(steps) {
        return this.getLink(steps.slice(0, -1));
    }
    getLinkParentAsDirOrThrow(filenameOrSteps, funcName) {
        const steps = (filenameOrSteps instanceof Array ? filenameOrSteps : (0, util_2.filenameToSteps)(filenameOrSteps)).slice(0, -1);
        const filename = pathSep + steps.join(pathSep);
        const link = this.getLinkOrThrow(filename, funcName);
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, funcName, filename);
        return link;
    }
    getFileByFd(fd) {
        return this.fds[String(fd)];
    }
    getFileByFdOrThrow(fd, funcName) {
        if (!(0, util_2.isFd)(fd))
            throw TypeError(constants_2.ERRSTR.FD);
        const file = this.getFileByFd(fd);
        if (!file)
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, funcName);
        return file;
    }
    _toJSON(link = this.root, json = {}, path, asBuffer) {
        let isEmpty = true;
        let children = link.children;
        if (link.getNode().isFile()) {
            children = new Map([[link.getName(), link.parent.getChild(link.getName())]]);
            link = link.parent;
        }
        for (const name of children.keys()) {
            if (name === '.' || name === '..') {
                continue;
            }
            isEmpty = false;
            const child = link.getChild(name);
            if (!child) {
                throw new Error('_toJSON: unexpected undefined');
            }
            const node = child.getNode();
            if (node.isFile()) {
                let filename = child.getPath();
                if (path)
                    filename = pathRelative(path, filename);
                json[filename] = asBuffer ? node.getBuffer() : node.getString();
            }
            else if (node.isDirectory()) {
                this._toJSON(child, json, path, asBuffer);
            }
        }
        let dirPath = link.getPath();
        if (path)
            dirPath = pathRelative(path, dirPath);
        if (dirPath && isEmpty) {
            json[dirPath] = null;
        }
        return json;
    }
    toJSON(paths, json = {}, isRelative = false, asBuffer = false) {
        const links = [];
        if (paths) {
            if (!Array.isArray(paths))
                paths = [paths];
            for (const path of paths) {
                const filename = (0, util_1.pathToFilename)(path);
                const link = this.getResolvedLink(filename);
                if (!link)
                    continue;
                links.push(link);
            }
        }
        else {
            links.push(this.root);
        }
        if (!links.length)
            return json;
        for (const link of links)
            this._toJSON(link, json, isRelative ? link.getPath() : '', asBuffer);
        return json;
    }
    // TODO: `cwd` should probably not invoke `process.cwd()`.
    fromJSON(json, cwd = process_1.default.cwd()) {
        for (let filename in json) {
            const data = json[filename];
            filename = (0, util_2.resolve)(filename, cwd);
            if (typeof data === 'string' || data instanceof buffer_1.Buffer) {
                const dir = (0, path_1.dirname)(filename);
                this.mkdirp(dir, 511 /* MODE.DIR */);
                const buffer = (0, util_2.dataToBuffer)(data);
                this.writeFile(filename, buffer, constants_2.FLAGS.w, 438 /* MODE.DEFAULT */);
            }
            else {
                this.mkdirp(filename, 511 /* MODE.DIR */);
            }
        }
    }
    fromNestedJSON(json, cwd) {
        this.fromJSON((0, json_1.flattenJSON)(json), cwd);
    }
    reset() {
        this.ino = 0;
        this.inodes = {};
        this.releasedInos = [];
        this.fds = {};
        this.releasedFds = [];
        this.openFiles = 0;
        this.root = this.createLink();
        this.root.setNode(this.createNode(constants_1.constants.S_IFDIR | 0o777));
    }
    // Legacy interface
    mountSync(mountpoint, json) {
        this.fromJSON(json, mountpoint);
    }
    openLink(link, flagsNum, resolveSymlinks = true) {
        if (this.openFiles >= this.maxFiles) {
            // Too many open files.
            throw (0, util_1.createError)("EMFILE" /* ERROR_CODE.EMFILE */, 'open', link.getPath());
        }
        // Resolve symlinks.
        //
        // @TODO: This should be superfluous. This method is only ever called by openFile(), which does its own symlink resolution
        // prior to calling.
        let realLink = link;
        if (resolveSymlinks)
            realLink = this.getResolvedLinkOrThrow(link.getPath(), 'open');
        const node = realLink.getNode();
        // Check whether node is a directory
        if (node.isDirectory()) {
            if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY)
                throw (0, util_1.createError)("EISDIR" /* ERROR_CODE.EISDIR */, 'open', link.getPath());
        }
        else {
            if (flagsNum & O_DIRECTORY)
                throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', link.getPath());
        }
        // Check node permissions
        // For read access: check if flags are O_RDONLY or O_RDWR (i.e., not only O_WRONLY)
        if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_WRONLY) {
            if (!node.canRead()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', link.getPath());
            }
        }
        // For write access: check if flags are O_WRONLY or O_RDWR
        if (flagsNum & (O_WRONLY | O_RDWR)) {
            if (!node.canWrite()) {
                throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', link.getPath());
            }
        }
        const file = new File_1.File(link, node, flagsNum, this.newFdNumber());
        this.fds[file.fd] = file;
        this.openFiles++;
        if (flagsNum & O_TRUNC)
            file.truncate();
        return file;
    }
    openFile(filename, flagsNum, modeNum, resolveSymlinks = true) {
        const steps = (0, util_2.filenameToSteps)(filename);
        let link;
        try {
            link = resolveSymlinks ? this.getResolvedLinkOrThrow(filename, 'open') : this.getLinkOrThrow(filename, 'open');
            // Check if file already existed when trying to create it exclusively (O_CREAT and O_EXCL flags are set).
            // This is an error, see https://pubs.opengroup.org/onlinepubs/009695399/functions/open.html:
            // "If O_CREAT and O_EXCL are set, open() shall fail if the file exists."
            if (link && flagsNum & O_CREAT && flagsNum & O_EXCL)
                throw (0, util_1.createError)("EEXIST" /* ERROR_CODE.EEXIST */, 'open', filename);
        }
        catch (err) {
            // Try creating a new file, if it does not exist and O_CREAT flag is set.
            // Note that this will still throw if the ENOENT came from one of the
            // intermediate directories instead of the file itself.
            if (err.code === "ENOENT" /* ERROR_CODE.ENOENT */ && flagsNum & O_CREAT) {
                const dirName = (0, path_1.dirname)(filename);
                const dirLink = this.getResolvedLinkOrThrow(dirName);
                const dirNode = dirLink.getNode();
                // Check that the place we create the new file is actually a directory and that we are allowed to do so:
                if (!dirNode.isDirectory())
                    throw (0, util_1.createError)("ENOTDIR" /* ERROR_CODE.ENOTDIR */, 'open', filename);
                if (!dirNode.canExecute() || !dirNode.canWrite())
                    throw (0, util_1.createError)("EACCES" /* ERROR_CODE.EACCES */, 'open', filename);
                // This is a difference to the original implementation, which would simply not create a file unless modeNum was specified.
                // However, current Node versions will default to 0o666.
                modeNum ?? (modeNum = 0o666);
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
            else
                throw err;
        }
        if (link)
            return this.openLink(link, flagsNum, resolveSymlinks);
        throw (0, util_1.createError)("ENOENT" /* ERROR_CODE.ENOENT */, 'open', filename);
    }
    closeFile(file) {
        if (!this.fds[file.fd])
            return;
        this.openFiles--;
        delete this.fds[file.fd];
        this.releasedFds.push(file.fd);
    }
    write(fd, buf, offset, length, position) {
        const file = this.getFileByFdOrThrow(fd, 'write');
        if (file.node.isSymlink()) {
            throw (0, util_1.createError)("EBADF" /* ERROR_CODE.EBADF */, 'write', file.link.getPath());
        }
        return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
    }
}
exports.Superblock = Superblock;
/**
 * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
 * up, so here, in order not to conflict with them, we choose some big number and descrease
 * the file descriptor of every new opened file.
 * @type {number}
 * @todo This should not be static, right?
 */
Superblock.fd = 0x7fffffff;
//# sourceMappingURL=Superblock.js.map