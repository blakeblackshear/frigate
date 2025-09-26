"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromSnapshot = exports.toSnapshot = void 0;
const toSnapshot = async ({ fs, path = '/', separator = '/' }) => {
    const stats = await fs.lstat(path);
    if (stats.isDirectory()) {
        const list = await fs.readdir(path);
        const entries = {};
        const dir = path.endsWith(separator) ? path : path + separator;
        const snapshots = await Promise.all(list.map(child => (0, exports.toSnapshot)({ fs, path: `${dir}${child}`, separator })));
        for (let i = 0; i < list.length; i++) {
            if (snapshots[i])
                entries['' + list[i]] = snapshots[i];
        }
        return [0 /* SnapshotNodeType.Folder */, {}, entries];
    }
    else if (stats.isFile()) {
        const buf = (await fs.readFile(path));
        const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        return [1 /* SnapshotNodeType.File */, {}, uint8];
    }
    else if (stats.isSymbolicLink()) {
        return [
            2 /* SnapshotNodeType.Symlink */,
            {
                target: (await fs.readlink(path, { encoding: 'utf8' })),
            },
        ];
    }
    return null;
};
exports.toSnapshot = toSnapshot;
const fromSnapshot = async (snapshot, { fs, path = '/', separator = '/' }) => {
    if (!snapshot)
        return;
    switch (snapshot[0]) {
        case 0 /* SnapshotNodeType.Folder */: {
            if (!path.endsWith(separator))
                path = path + separator;
            const [, , entries] = snapshot;
            await fs.mkdir(path, { recursive: true });
            for (const [name, child] of Object.entries(entries))
                await (0, exports.fromSnapshot)(child, { fs, path: `${path}${name}`, separator });
            break;
        }
        case 1 /* SnapshotNodeType.File */: {
            const [, , data] = snapshot;
            await fs.writeFile(path, data);
            break;
        }
        case 2 /* SnapshotNodeType.Symlink */: {
            const [, { target }] = snapshot;
            await fs.symlink(target, path);
            break;
        }
    }
};
exports.fromSnapshot = fromSnapshot;
//# sourceMappingURL=async.js.map