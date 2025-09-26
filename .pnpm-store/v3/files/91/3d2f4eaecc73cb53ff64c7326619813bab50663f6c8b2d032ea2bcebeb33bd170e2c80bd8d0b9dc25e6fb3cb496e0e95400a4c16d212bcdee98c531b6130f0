import { FsaNodeDirent } from './FsaNodeDirent';
import { FsaNodeStats } from './FsaNodeStats';
import { FsSynchronousApi } from '../node/types/FsSynchronousApi';
import { FsaNodeWriteStream } from './FsaNodeWriteStream';
import { FsaNodeReadStream } from './FsaNodeReadStream';
import { FsaNodeCore } from './FsaNodeCore';
import type { FsCallbackApi, FsPromisesApi } from '../node/types';
import type * as misc from '../node/types/misc';
import type * as opts from '../node/types/options';
import type { FsCommonObjects } from '../node/types/FsCommonObjects';
/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
export declare class FsaNodeFs extends FsaNodeCore implements FsCallbackApi, FsSynchronousApi, FsCommonObjects {
    readonly promises: FsPromisesApi;
    readonly open: FsCallbackApi['open'];
    readonly close: FsCallbackApi['close'];
    readonly read: FsCallbackApi['read'];
    readonly readFile: FsCallbackApi['readFile'];
    readonly write: FsCallbackApi['write'];
    readonly writev: FsCallbackApi['writev'];
    readonly writeFile: FsCallbackApi['writeFile'];
    readonly copyFile: FsCallbackApi['copyFile'];
    /**
     * @todo There is a proposal for native "self remove" operation.
     * @see https://github.com/whatwg/fs/blob/main/proposals/Remove.md
     */
    readonly unlink: FsCallbackApi['unlink'];
    readonly realpath: FsCallbackApi['realpath'];
    readonly stat: FsCallbackApi['stat'];
    readonly lstat: FsCallbackApi['lstat'];
    readonly fstat: FsCallbackApi['fstat'];
    private getHandleStats;
    /**
     * @todo There is a proposal for native move support.
     * @see https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md
     */
    readonly rename: FsCallbackApi['rename'];
    readonly exists: FsCallbackApi['exists'];
    readonly access: FsCallbackApi['access'];
    readonly appendFile: FsCallbackApi['appendFile'];
    readonly readdir: FsCallbackApi['readdir'];
    readonly readlink: FsCallbackApi['readlink'];
    /** @todo Could this use `FileSystemSyncAccessHandle.flush` through a Worker thread? */
    readonly fsync: FsCallbackApi['fsync'];
    readonly fdatasync: FsCallbackApi['fdatasync'];
    readonly ftruncate: FsCallbackApi['ftruncate'];
    readonly truncate: FsCallbackApi['truncate'];
    readonly futimes: FsCallbackApi['futimes'];
    readonly utimes: FsCallbackApi['utimes'];
    readonly mkdir: FsCallbackApi['mkdir'];
    readonly mkdtemp: FsCallbackApi['mkdtemp'];
    private rmAll;
    readonly rmdir: FsCallbackApi['rmdir'];
    readonly rm: FsCallbackApi['rm'];
    readonly fchmod: FsCallbackApi['fchmod'];
    readonly chmod: FsCallbackApi['chmod'];
    readonly lchmod: FsCallbackApi['lchmod'];
    readonly fchown: FsCallbackApi['fchown'];
    readonly chown: FsCallbackApi['chown'];
    readonly lchown: FsCallbackApi['lchown'];
    readonly createWriteStream: FsCallbackApi['createWriteStream'];
    readonly createReadStream: FsCallbackApi['createReadStream'];
    openAsBlob: (path: misc.PathLike, options?: opts.IOpenAsBlobOptions) => Promise<Blob>;
    readonly cp: FsCallbackApi['cp'];
    readonly lutimes: FsCallbackApi['lutimes'];
    readonly opendir: FsCallbackApi['opendir'];
    readonly readv: FsCallbackApi['readv'];
    readonly statfs: FsCallbackApi['statfs'];
    readonly glob: FsCallbackApi['glob'];
    /**
     * @todo Implement using `FileSystemObserver` class.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
     */
    readonly watchFile: FsCallbackApi['watchFile'];
    readonly unwatchFile: FsCallbackApi['unwatchFile'];
    readonly watch: FsCallbackApi['watch'];
    readonly symlink: FsCallbackApi['symlink'];
    readonly link: FsCallbackApi['link'];
    readonly statSync: FsSynchronousApi['statSync'];
    readonly lstatSync: FsSynchronousApi['lstatSync'];
    readonly fstatSync: FsSynchronousApi['fstatSync'];
    readonly accessSync: FsSynchronousApi['accessSync'];
    readonly readFileSync: FsSynchronousApi['readFileSync'];
    readonly writeFileSync: FsSynchronousApi['writeFileSync'];
    readonly appendFileSync: FsSynchronousApi['appendFileSync'];
    readonly closeSync: FsSynchronousApi['closeSync'];
    readonly existsSync: FsSynchronousApi['existsSync'];
    readonly copyFileSync: FsSynchronousApi['copyFileSync'];
    readonly renameSync: FsSynchronousApi['renameSync'];
    readonly rmdirSync: FsSynchronousApi['rmdirSync'];
    readonly rmSync: FsSynchronousApi['rmSync'];
    readonly mkdirSync: FsSynchronousApi['mkdirSync'];
    readonly mkdtempSync: FsSynchronousApi['mkdtempSync'];
    readonly readlinkSync: FsSynchronousApi['readlinkSync'];
    readonly truncateSync: FsSynchronousApi['truncateSync'];
    readonly ftruncateSync: FsSynchronousApi['ftruncateSync'];
    readonly unlinkSync: FsSynchronousApi['unlinkSync'];
    readonly readdirSync: FsSynchronousApi['readdirSync'];
    readonly realpathSync: FsSynchronousApi['realpathSync'];
    readonly readSync: FsSynchronousApi['readSync'];
    readonly writeSync: FsSynchronousApi['writeSync'];
    readonly openSync: FsSynchronousApi['openSync'];
    readonly writevSync: FsSynchronousApi['writevSync'];
    readonly fdatasyncSync: FsSynchronousApi['fdatasyncSync'];
    readonly fsyncSync: FsSynchronousApi['fsyncSync'];
    readonly chmodSync: FsSynchronousApi['chmodSync'];
    readonly chownSync: FsSynchronousApi['chownSync'];
    readonly fchmodSync: FsSynchronousApi['fchmodSync'];
    readonly fchownSync: FsSynchronousApi['fchownSync'];
    readonly futimesSync: FsSynchronousApi['futimesSync'];
    readonly lchmodSync: FsSynchronousApi['lchmodSync'];
    readonly lchownSync: FsSynchronousApi['lchownSync'];
    readonly utimesSync: FsSynchronousApi['utimesSync'];
    readonly lutimesSync: FsSynchronousApi['lutimesSync'];
    readonly cpSync: FsSynchronousApi['cpSync'];
    readonly opendirSync: FsSynchronousApi['opendirSync'];
    readonly statfsSync: FsSynchronousApi['statfsSync'];
    readonly readvSync: FsSynchronousApi['readvSync'];
    readonly globSync: FsSynchronousApi['globSync'];
    readonly symlinkSync: FsSynchronousApi['symlinkSync'];
    readonly linkSync: FsSynchronousApi['linkSync'];
    readonly F_OK: number;
    readonly R_OK: number;
    readonly W_OK: number;
    readonly X_OK: number;
    readonly constants: {
        O_RDONLY: number;
        O_WRONLY: number;
        O_RDWR: number;
        S_IFMT: number;
        S_IFREG: number;
        S_IFDIR: number;
        S_IFCHR: number;
        S_IFBLK: number;
        S_IFIFO: number;
        S_IFLNK: number;
        S_IFSOCK: number;
        O_CREAT: number;
        O_EXCL: number;
        O_NOCTTY: number;
        O_TRUNC: number;
        O_APPEND: number;
        O_DIRECTORY: number;
        O_NOATIME: number;
        O_NOFOLLOW: number;
        O_SYNC: number;
        O_SYMLINK: number;
        O_DIRECT: number;
        O_NONBLOCK: number;
        S_IRWXU: number;
        S_IRUSR: number;
        S_IWUSR: number;
        S_IXUSR: number;
        S_IRWXG: number;
        S_IRGRP: number;
        S_IWGRP: number;
        S_IXGRP: number;
        S_IRWXO: number;
        S_IROTH: number;
        S_IWOTH: number;
        S_IXOTH: number;
        F_OK: number;
        R_OK: number;
        W_OK: number;
        X_OK: number;
        UV_FS_SYMLINK_DIR: number;
        UV_FS_SYMLINK_JUNCTION: number;
        UV_FS_COPYFILE_EXCL: number;
        UV_FS_COPYFILE_FICLONE: number;
        UV_FS_COPYFILE_FICLONE_FORCE: number;
        COPYFILE_EXCL: number;
        COPYFILE_FICLONE: number;
        COPYFILE_FICLONE_FORCE: number;
    };
    readonly Dirent: typeof FsaNodeDirent;
    readonly Stats: {
        new (isBigInt: boolean, size: any, kind: "file" | "directory"): FsaNodeStats<any>;
    };
    readonly WriteStream: typeof FsaNodeWriteStream;
    readonly ReadStream: typeof FsaNodeReadStream;
    readonly StatFs: any;
    readonly Dir: any;
    readonly StatsWatcher: any;
    readonly FSWatcher: any;
}
