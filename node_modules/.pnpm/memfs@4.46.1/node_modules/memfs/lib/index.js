"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memfs = exports.fs = exports.vol = exports.Volume = void 0;
exports.createFsFromVolume = createFsFromVolume;
const Stats_1 = require("./node/Stats");
const Dirent_1 = require("./node/Dirent");
const volume_1 = require("./node/volume");
Object.defineProperty(exports, "Volume", { enumerable: true, get: function () { return volume_1.Volume; } });
const constants_1 = require("./constants");
const fsSynchronousApiList_1 = require("./node/lists/fsSynchronousApiList");
const fsCallbackApiList_1 = require("./node/lists/fsCallbackApiList");
const { F_OK, R_OK, W_OK, X_OK } = constants_1.constants;
// Default volume.
exports.vol = new volume_1.Volume();
function createFsFromVolume(vol) {
    const fs = { F_OK, R_OK, W_OK, X_OK, constants: constants_1.constants, Stats: Stats_1.default, Dirent: Dirent_1.default };
    // Bind FS methods.
    for (const method of fsSynchronousApiList_1.fsSynchronousApiList)
        if (typeof vol[method] === 'function')
            fs[method] = vol[method].bind(vol);
    for (const method of fsCallbackApiList_1.fsCallbackApiList)
        if (typeof vol[method] === 'function')
            fs[method] = vol[method].bind(vol);
    fs.StatWatcher = vol.StatWatcher;
    fs.FSWatcher = vol.FSWatcher;
    fs.WriteStream = vol.WriteStream;
    fs.ReadStream = vol.ReadStream;
    fs.promises = vol.promises;
    // Handle realpath and realpathSync with their .native properties
    if (typeof vol.realpath === 'function') {
        fs.realpath = vol.realpath.bind(vol);
        if (typeof vol.realpath.native === 'function') {
            fs.realpath.native = vol.realpath.native.bind(vol);
        }
    }
    if (typeof vol.realpathSync === 'function') {
        fs.realpathSync = vol.realpathSync.bind(vol);
        if (typeof vol.realpathSync.native === 'function') {
            fs.realpathSync.native = vol.realpathSync.native.bind(vol);
        }
    }
    fs._toUnixTimestamp = volume_1.toUnixTimestamp;
    fs.__vol = vol;
    return fs;
}
exports.fs = createFsFromVolume(exports.vol);
/**
 * Creates a new file system instance.
 *
 * @param json File system structure expressed as a JSON object.
 *        Use `null` for empty directories and empty string for empty files.
 * @param cwd Current working directory. The JSON structure will be created
 *        relative to this path.
 * @returns A `memfs` file system instance, which is a drop-in replacement for
 *          the `fs` module.
 */
const memfs = (json = {}, cwd = '/') => {
    const vol = volume_1.Volume.fromNestedJSON(json, cwd);
    const fs = createFsFromVolume(vol);
    return { fs, vol };
};
exports.memfs = memfs;
module.exports = { ...module.exports, ...exports.fs };
module.exports.semantic = true;
//# sourceMappingURL=index.js.map