"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromSnapshotSync = exports.toSnapshotSync = void 0;
const toSnapshotSync = ({ fs, path = '/', separator = '/' }) => {
    const stats = fs.lstatSync(path);
    if (stats.isDirectory()) {
        const list = fs.readdirSync(path);
        const entries = {};
        const dir = path.endsWith(separator) ? path : path + separator;
        for (const child of list) {
            const childSnapshot = (0, exports.toSnapshotSync)({ fs, path: `${dir}${child}`, separator });
            if (childSnapshot)
                entries['' + child] = childSnapshot;
        }
        return [0 /* SnapshotNodeType.Folder */, {}, entries];
    }
    else if (stats.isFile()) {
        const buf = fs.readFileSync(path);
        const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        return [1 /* SnapshotNodeType.File */, {}, uint8];
    }
    else if (stats.isSymbolicLink()) {
        return [
            2 /* SnapshotNodeType.Symlink */,
            {
                target: fs.readlinkSync(path).toString(),
            },
        ];
    }
    return null;
};
exports.toSnapshotSync = toSnapshotSync;
const fromSnapshotSync = (snapshot, { fs, path = '/', separator = '/' }) => {
    if (!snapshot)
        return;
    switch (snapshot[0]) {
        case 0 /* SnapshotNodeType.Folder */: {
            if (!path.endsWith(separator))
                path = path + separator;
            const [, , entries] = snapshot;
            fs.mkdirSync(path, { recursive: true });
            for (const [name, child] of Object.entries(entries))
                (0, exports.fromSnapshotSync)(child, { fs, path: `${path}${name}`, separator });
            break;
        }
        case 1 /* SnapshotNodeType.File */: {
            const [, , data] = snapshot;
            fs.writeFileSync(path, data);
            break;
        }
        case 2 /* SnapshotNodeType.Symlink */: {
            const [, { target }] = snapshot;
            fs.symlinkSync(target, path);
            break;
        }
    }
};
exports.fromSnapshotSync = fromSnapshotSync;
//# sourceMappingURL=sync.js.map