import { FanOutUnsubscribe } from 'thingies/lib/fanout';
import { Link, Superblock } from '../core';
import Stats from './Stats';
import Dirent from './Dirent';
import StatFs from './StatFs';
import { Buffer } from '../vendor/node/internal/buffer';
import { TSetTimeout } from '../setTimeoutUnref';
import { Writable } from '../vendor/node/stream';
import { constants } from '../constants';
import { EventEmitter } from '../vendor/node/events';
import { TDataOut } from '../encoding';
import * as misc from './types/misc';
import * as opts from './types/options';
import { FsCallbackApi, WritevCallback } from './types/FsCallbackApi';
import { ToTreeOptions } from '../print';
import type { PathLike, symlink } from './types/misc';
import type { FsPromisesApi, FsSynchronousApi } from './types';
import { Dir } from './Dir';
import { DirectoryJSON, NestedDirectoryJSON } from '../core/json';
import { TFileId } from '../core/types';
export interface IError extends Error {
    code?: string;
}
export type TData = TDataOut | ArrayBufferView | DataView;
export type TFlags = string | number;
export type TMode = string | number;
export type TTime = number | string | Date;
export type TFlagsCopy = typeof constants.COPYFILE_EXCL | typeof constants.COPYFILE_FICLONE | typeof constants.COPYFILE_FICLONE_FORCE;
export interface IAppendFileOptions extends opts.IFileOptions {
}
export interface IWatchFileOptions {
    persistent?: boolean;
    interval?: number;
}
export interface IWatchOptions extends opts.IOptions {
    persistent?: boolean;
    recursive?: boolean;
}
export declare function pathToSteps(path: PathLike): string[];
export declare function dataToStr(data: TData, encoding?: BufferEncoding): string;
export declare function toUnixTimestamp(time: any): any;
/**
 * `Volume` represents a file system.
 */
export declare class Volume implements FsCallbackApi, FsSynchronousApi {
    readonly _core: Superblock;
    static readonly fromJSON: (json: DirectoryJSON, cwd?: string) => Volume;
    static readonly fromNestedJSON: (json: NestedDirectoryJSON, cwd?: string) => Volume;
    StatWatcher: new () => StatWatcher;
    ReadStream: new (...args: any[]) => misc.IReadStream;
    WriteStream: new (...args: any[]) => IWriteStream;
    FSWatcher: new () => FSWatcher;
    realpath: {
        (path: PathLike, callback: misc.TCallback<TDataOut>): void;
        (path: PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<TDataOut>): void;
        native: {
            (path: PathLike, callback: misc.TCallback<TDataOut>): void;
            (path: PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<TDataOut>): void;
        };
    };
    realpathSync: {
        (path: PathLike, options?: opts.IRealpathOptions | string): TDataOut;
        native: (path: PathLike, options?: opts.IRealpathOptions | string) => TDataOut;
    };
    private promisesApi;
    get promises(): FsPromisesApi;
    constructor(_core?: Superblock);
    private wrapAsync;
    toTree(opts?: ToTreeOptions): string;
    reset(): void;
    toJSON(paths?: PathLike | PathLike[], json?: {}, isRelative?: boolean, asBuffer?: boolean): DirectoryJSON<string | null>;
    fromJSON(json: DirectoryJSON, cwd?: string): void;
    fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): void;
    mountSync(mountpoint: string, json: DirectoryJSON): void;
    openSync: (path: PathLike, flags: TFlags, mode?: TMode) => number;
    open: {
        (path: PathLike, flags: TFlags, /* ... */ callback: misc.TCallback<number>): void;
        (path: PathLike, flags: TFlags, mode: TMode, callback: misc.TCallback<number>): void;
    };
    closeSync: (fd: number) => void;
    close: (fd: number, callback: misc.TCallback<void>) => void;
    readSync: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number | null) => number;
    read: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number | null, callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void) => void;
    readv: {
        (fd: number, buffers: ArrayBufferView[], callback: misc.TCallback2<number, ArrayBufferView[]>): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: misc.TCallback2<number, ArrayBufferView[]>): void;
    };
    readvSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    private readonly _readfile;
    readFileSync: (file: TFileId, options?: opts.IReadFileOptions | string) => TDataOut;
    readFile: {
        (id: TFileId, callback: misc.TCallback<TDataOut>): any;
        (id: TFileId, options: opts.IReadFileOptions | string, callback: misc.TCallback<TDataOut>): any;
    };
    private _write;
    writeSync: {
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): number;
        (fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
    };
    write: {
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, callback: (...args: any[]) => void): any;
        (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number, callback: (...args: any[]) => void): any;
        (fd: number, str: string, callback: (...args: any[]) => void): any;
        (fd: number, str: string, position: number, callback: (...args: any[]) => void): any;
        (fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args: any[]) => void): any;
    };
    private writevBase;
    writev: {
        (fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
        (fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
    };
    writevSync: (fd: number, buffers: ArrayBufferView[], position?: number | null) => number;
    writeFileSync: (id: TFileId, data: TData, options?: opts.IWriteFileOptions) => void;
    writeFile: {
        (id: TFileId, data: TData, callback: misc.TCallback<void>): void;
        (id: TFileId, data: TData, options: opts.IWriteFileOptions | string, callback: misc.TCallback<void>): void;
    };
    private _copyFile;
    copyFileSync: (src: PathLike, dest: PathLike, flags?: TFlagsCopy) => void;
    copyFile: {
        (src: PathLike, dest: PathLike, callback: misc.TCallback<void>): any;
        (src: PathLike, dest: PathLike, flags: TFlagsCopy, callback: misc.TCallback<void>): any;
    };
    private readonly _cp;
    private isSrcSubdir;
    private cpFileSync;
    private cpDirSync;
    private cpSymlinkSync;
    linkSync: (existingPath: PathLike, newPath: PathLike) => void;
    link: (existingPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => void;
    unlinkSync: (path: PathLike) => void;
    unlink: (path: PathLike, callback: misc.TCallback<void>) => void;
    /**
     * `type` argument works only on Windows.
     * @param target
     * @param path
     * @param type
     */
    symlinkSync: (target: PathLike, path: PathLike, type?: symlink.Type) => void;
    symlink: {
        (target: PathLike, path: PathLike, callback: misc.TCallback<void>): any;
        (target: PathLike, path: PathLike, type: symlink.Type, callback: misc.TCallback<void>): any;
    };
    private readonly _lstat;
    lstatSync: {
        (path: PathLike): Stats<number>;
        (path: PathLike, options: {
            throwIfNoEntry?: true | undefined;
        }): Stats<number>;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry?: true | undefined;
        }): Stats<number>;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry?: true | undefined;
        }): Stats<bigint>;
        (path: PathLike, options: {
            throwIfNoEntry: false;
        }): Stats<number> | undefined;
        (path: PathLike, options: {
            bigint: false;
            throwIfNoEntry: false;
        }): Stats<number> | undefined;
        (path: PathLike, options: {
            bigint: true;
            throwIfNoEntry: false;
        }): Stats<bigint> | undefined;
    };
    lstat(path: PathLike, callback: misc.TCallback<Stats>): void;
    lstat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
    private _stat;
    statSync(path: PathLike): Stats<number>;
    statSync(path: PathLike, options: {
        throwIfNoEntry?: true;
    }): Stats<number>;
    statSync(path: PathLike, options: {
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
    statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry?: true;
    }): Stats<number>;
    statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry?: true;
    }): Stats<bigint>;
    statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
    statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry: false;
    }): Stats<bigint> | undefined;
    stat(path: PathLike, callback: misc.TCallback<Stats>): void;
    stat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
    private fstatBase;
    fstatSync(fd: number): Stats<number>;
    fstatSync(fd: number, options: {
        bigint: false;
    }): Stats<number>;
    fstatSync(fd: number, options: {
        bigint: true;
    }): Stats<bigint>;
    fstat(fd: number, callback: misc.TCallback<Stats>): void;
    fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<Stats>): void;
    renameSync: (oldPath: PathLike, newPath: PathLike) => void;
    rename: (oldPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => void;
    private _exists;
    existsSync: (path: PathLike) => boolean;
    exists: (path: PathLike, callback: (exists: boolean) => void) => void;
    private _access;
    accessSync: (path: PathLike, mode?: number) => void;
    access: {
        (path: PathLike, callback: misc.TCallback<void>): any;
        (path: PathLike, mode: number, callback: misc.TCallback<void>): any;
    };
    appendFileSync: (id: TFileId, data: TData, options?: IAppendFileOptions | string) => void;
    appendFile: {
        (id: TFileId, data: TData, callback: misc.TCallback<void>): any;
        (id: TFileId, data: TData, options: IAppendFileOptions | string, callback: misc.TCallback<void>): any;
    };
    private readonly _readdir;
    readdirSync: (path: PathLike, options?: opts.IReaddirOptions | string) => TDataOut[] | Dirent[];
    readdir: {
        (path: PathLike, callback: misc.TCallback<TDataOut[] | Dirent[]>): any;
        (path: PathLike, options: opts.IReaddirOptions | string, callback: misc.TCallback<TDataOut[] | Dirent[]>): any;
    };
    private readonly _readlink;
    readlinkSync: (path: PathLike, options?: opts.IOptions) => TDataOut;
    readlink: {
        (path: PathLike, callback: misc.TCallback<TDataOut>): any;
        (path: PathLike, options: opts.IOptions, callback: misc.TCallback<TDataOut>): any;
    };
    private readonly _fsync;
    fsyncSync: (fd: number) => void;
    fsync: (fd: number, callback: misc.TCallback<void>) => void;
    private readonly _fdatasync;
    fdatasyncSync: (fd: number) => void;
    fdatasync: (fd: number, callback: misc.TCallback<void>) => void;
    private readonly _ftruncate;
    ftruncateSync: (fd: number, len?: number) => void;
    ftruncate: {
        (fd: number, callback: misc.TCallback<void>): any;
        (fd: number, len: number, callback: misc.TCallback<void>): any;
    };
    private readonly _truncate;
    /**
     * `id` should be a file descriptor or a path. `id` as file descriptor will
     * not be supported soon.
     */
    truncateSync: (id: TFileId, len?: number) => void;
    truncate: {
        (id: TFileId, callback: misc.TCallback<void>): any;
        (id: TFileId, len: number, callback: misc.TCallback<void>): any;
    };
    private readonly _futimes;
    futimesSync: (fd: number, atime: TTime, mtime: TTime) => void;
    futimes: (fd: number, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void;
    private readonly _utimes;
    utimesSync: (path: PathLike, atime: TTime, mtime: TTime) => void;
    utimes: (path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void;
    lutimesSync: (path: PathLike, atime: TTime, mtime: TTime) => void;
    lutimes: (path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void;
    mkdirSync: {
        (path: PathLike, options: opts.IMkdirOptions & {
            recursive: true;
        }): string | undefined;
        (path: PathLike, options?: TMode | (opts.IMkdirOptions & {
            recursive?: false;
        })): void;
        (path: PathLike, options?: TMode | opts.IMkdirOptions): string | undefined;
    };
    mkdir: {
        (path: PathLike, callback: misc.TCallback<void>): any;
        (path: PathLike, mode: TMode | (opts.IMkdirOptions & {
            recursive?: false;
        }), callback: misc.TCallback<void>): any;
        (path: PathLike, mode: opts.IMkdirOptions & {
            recursive: true;
        }, callback: misc.TCallback<string>): any;
        (path: PathLike, mode: TMode | opts.IMkdirOptions, callback: misc.TCallback<string>): any;
    };
    private readonly _mkdtemp;
    mkdtempSync: (prefix: string, options?: opts.IOptions) => TDataOut;
    mkdtemp: {
        (prefix: string, callback: misc.TCallback<string>): any;
        (prefix: string, options: opts.IOptions, callback: misc.TCallback<string>): any;
    };
    rmdirSync: (path: PathLike, options?: opts.IRmdirOptions) => void;
    rmdir: {
        (path: PathLike, callback: misc.TCallback<void>): any;
        (path: PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>): any;
    };
    rmSync: (path: PathLike, options?: opts.IRmOptions) => void;
    rm: {
        (path: PathLike, callback: misc.TCallback<void>): void;
        (path: PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void;
    };
    private readonly _fchmod;
    fchmodSync: (fd: number, mode: TMode) => void;
    fchmod: (fd: number, mode: TMode, callback: misc.TCallback<void>) => void;
    private readonly _chmod;
    chmodSync: (path: PathLike, mode: TMode) => void;
    chmod: (path: PathLike, mode: TMode, callback: misc.TCallback<void>) => void;
    private readonly _lchmod;
    lchmodSync: (path: PathLike, mode: TMode) => void;
    lchmod: (path: PathLike, mode: TMode, callback: misc.TCallback<void>) => void;
    private readonly _fchown;
    fchownSync: (fd: number, uid: number, gid: number) => void;
    fchown: (fd: number, uid: number, gid: number, callback: misc.TCallback<void>) => void;
    private readonly _chown;
    chownSync: (path: PathLike, uid: number, gid: number) => void;
    chown: (path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => void;
    private readonly _lchown;
    lchownSync: (path: PathLike, uid: number, gid: number) => void;
    lchown: (path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => void;
    private statWatchers;
    watchFile(path: PathLike, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    watchFile(path: PathLike, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    unwatchFile(path: PathLike, listener?: (curr: Stats, prev: Stats) => void): void;
    createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream;
    createWriteStream(path: PathLike, options?: opts.IWriteStreamOptions | string): IWriteStream;
    watch(path: PathLike, options?: IWatchOptions | string, listener?: (eventType: string, filename: string) => void): FSWatcher;
    cpSync: (src: string | URL, dest: string | URL, options?: opts.ICpOptions) => void;
    cp: {
        (src: string | URL, dest: string | URL, callback: misc.TCallback<void>): any;
        (src: string | URL, dest: string | URL, options: opts.ICpOptions, callback: misc.TCallback<void>): any;
    };
    private _statfs;
    statfsSync(path: PathLike): StatFs<number>;
    statfsSync(path: PathLike, options: {
        bigint: false;
    }): StatFs<number>;
    statfsSync(path: PathLike, options: {
        bigint: true;
    }): StatFs<bigint>;
    statfs(path: PathLike, callback: misc.TCallback<StatFs>): void;
    statfs(path: PathLike, options: opts.IStafsOptions, callback: misc.TCallback<StatFs>): void;
    openAsBlob: (path: PathLike, options?: opts.IOpenAsBlobOptions) => Promise<Blob>;
    glob: FsCallbackApi['glob'];
    globSync: FsSynchronousApi['globSync'];
    private readonly _globSync;
    private readonly _opendir;
    opendirSync: (path: PathLike, options?: opts.IOpendirOptions | string) => Dir;
    opendir: {
        (path: PathLike, callback: misc.TCallback<Dir>): any;
        (path: PathLike, options: opts.IOpendirOptions | string, callback: misc.TCallback<Dir>): any;
    };
}
export declare class StatWatcher extends EventEmitter {
    vol: Volume;
    filename: string;
    interval: number;
    timeoutRef?: any;
    setTimeout: TSetTimeout;
    prev: Stats;
    constructor(vol: Volume);
    private loop;
    private hasChanged;
    private onInterval;
    start(path: string, persistent?: boolean, interval?: number): void;
    stop(): void;
}
export interface IWriteStream extends Writable {
    bytesWritten: number;
    path: string;
    pending: boolean;
    new (path: PathLike, options: opts.IWriteStreamOptions): any;
    open(): any;
    close(): any;
}
export declare class FSWatcher extends EventEmitter {
    _vol: Volume;
    _filename: string;
    _steps: string[];
    _filenameEncoded: TDataOut;
    _recursive: boolean;
    _encoding: BufferEncoding;
    _link: Link;
    _timer: any;
    private _listenerRemovers;
    constructor(vol: Volume);
    private _getName;
    private _onParentChild;
    private _emit;
    private _persist;
    start(path: PathLike, persistent?: boolean, recursive?: boolean, encoding?: BufferEncoding): void;
    protected _parentChangesUnsub: FanOutUnsubscribe;
    close(): void;
}
