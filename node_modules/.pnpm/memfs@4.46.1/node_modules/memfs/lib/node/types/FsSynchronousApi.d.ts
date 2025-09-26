import type * as misc from './misc';
import type * as opts from './options';
export interface FsSynchronousApi {
    accessSync: (path: misc.PathLike, mode?: number) => void;
    appendFileSync: (id: misc.TFileId, data: misc.TData, options?: opts.IAppendFileOptions | string) => void;
    chmodSync: (path: misc.PathLike, mode: misc.TMode) => void;
    chownSync: (path: misc.PathLike, uid: number, gid: number) => void;
    closeSync: (fd: number) => void;
    copyFileSync: (src: misc.PathLike, dest: misc.PathLike, flags?: misc.TFlagsCopy) => void;
    cpSync: (src: string | URL, dest: string | URL, options?: opts.ICpOptions) => void;
    existsSync: (path: misc.PathLike) => boolean;
    fchmodSync: (fd: number, mode: misc.TMode) => void;
    fchownSync: (fd: number, uid: number, gid: number) => void;
    fdatasyncSync: (fd: number) => void;
    fstatSync: {
        (fd: number, options: {
            bigint: false;
        }): misc.IStats<number>;
        (fd: number, options: {
            bigint: true;
        }): misc.IStats<bigint>;
        (fd: number): misc.IStats<number>;
    };
    fsyncSync: (fd: number) => void;
    ftruncateSync: (fd: number, len?: number) => void;
    futimesSync: (fd: number, atime: misc.TTime, mtime: misc.TTime) => void;
    globSync: (pattern: string, options?: opts.IGlobOptions) => string[];
    lchmodSync: (path: misc.PathLike, mode: misc.TMode) => void;
    lchownSync: (path: misc.PathLike, uid: number, gid: number) => void;
    lutimesSync: (path: misc.PathLike, atime: number | string | Date, time: number | string | Date) => void;
    linkSync: (existingPath: misc.PathLike, newPath: misc.PathLike) => void;
    lstatSync: {
        (path: misc.PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): misc.IStats<number> | undefined;
        (path: misc.PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true | undefined;
        }): misc.IStats<number>;
        (path: misc.PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): misc.IStats<bigint> | undefined;
        (path: misc.PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true | undefined;
        }): misc.IStats<bigint>;
        (path: misc.PathLike, options: {
            throwIfNoEntry: false;
        }): misc.IStats<number> | undefined;
        (path: misc.PathLike, options: {
            throwIfNoEntry?: true | undefined;
        }): misc.IStats<number>;
        (path: misc.PathLike): misc.IStats<number>;
    };
    mkdirSync: {
        (path: misc.PathLike, options: opts.IMkdirOptions & {
            recursive: true;
        }): string | undefined;
        (path: misc.PathLike, options?: misc.TMode | (opts.IMkdirOptions & {
            recursive?: false;
        })): void;
        (path: misc.PathLike, options?: misc.TMode | opts.IMkdirOptions): string | undefined;
    };
    mkdtempSync: (prefix: string, options?: opts.IOptions) => misc.TDataOut;
    openSync: (path: misc.PathLike, flags: misc.TFlags, mode?: misc.TMode) => number;
    opendirSync: (path: misc.PathLike, options?: opts.IOpendirOptions) => misc.IDir;
    readdirSync: (path: misc.PathLike, options?: opts.IReaddirOptions | string) => misc.TDataOut[] | misc.IDirent[];
    readlinkSync: (path: misc.PathLike, options?: opts.IOptions) => misc.TDataOut;
    readSync: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number) => number;
    readFileSync: (file: misc.TFileId, options?: opts.IReadFileOptions | string) => misc.TDataOut;
    readvSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    realpathSync: (path: misc.PathLike, options?: opts.IRealpathOptions | string) => misc.TDataOut;
    renameSync: (oldPath: misc.PathLike, newPath: misc.PathLike) => void;
    rmdirSync: (path: misc.PathLike, options?: opts.IRmdirOptions) => void;
    rmSync: (path: misc.PathLike, options?: opts.IRmOptions) => void;
    statSync: {
        (path: misc.PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): misc.IStats<number> | undefined;
        (path: misc.PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true;
        }): misc.IStats<number>;
        (path: misc.PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): misc.IStats<bigint> | undefined;
        (path: misc.PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true;
        }): misc.IStats<bigint>;
        (path: misc.PathLike, options: {
            throwIfNoEntry: false;
        }): misc.IStats<number> | undefined;
        (path: misc.PathLike, options: {
            throwIfNoEntry?: true;
        }): misc.IStats<number>;
        (path: misc.PathLike): misc.IStats<number>;
    };
    statfsSync: (path: misc.PathLike, options?: opts.IStafsOptions) => misc.IStatFs;
    symlinkSync: (target: misc.PathLike, path: misc.PathLike, type?: misc.symlink.Type) => void;
    truncateSync: (id: misc.TFileId, len?: number) => void;
    unlinkSync: (path: misc.PathLike) => void;
    utimesSync: (path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime) => void;
    writeFileSync: (id: misc.TFileId, data: misc.TData, options?: opts.IWriteFileOptions) => void;
    writeSync: {
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): number;
        (fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
    };
    writevSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
}
