import type { PathLike as NodePathLike, symlink } from '../../vendor/node/fs';
import type { constants } from '../../constants';
import type { EventEmitter } from '../../vendor/node/events';
import type { TSetTimeout } from '../../setTimeoutUnref';
import type { IAppendFileOptions, IFileHandleReadStreamOptions, IFileHandleWriteStreamOptions, IReadableWebStreamOptions, IReadFileOptions, IStatOptions, IWriteFileOptions } from './options';
import type { Readable, Writable } from '../../vendor/node/stream';
export { symlink };
export type PathLike = NodePathLike | Uint8Array;
export type TDataOut = string | Buffer;
export type TEncodingExtended = BufferEncoding | 'buffer';
export type TFileId = PathLike | number;
export type TData = TDataOut | ArrayBufferView | DataView;
export type TPromisesData = TData | Readable;
export type TFlags = string | number;
export type TMode = string | number;
export type TTime = number | string | Date;
export type TCallback<TData> = (error?: IError | null, data?: TData) => void;
export type TCallback2<T1, T2> = (error: IError | null, bytesRead?: T1, buffers?: T2) => void;
export interface IError extends Error {
    code?: string;
}
export type TFlagsCopy = typeof constants.COPYFILE_EXCL | typeof constants.COPYFILE_FICLONE | typeof constants.COPYFILE_FICLONE_FORCE;
export type TStatNumber = number | bigint;
export interface IStats<T = TStatNumber> {
    uid: T;
    gid: T;
    rdev: T;
    blksize: T;
    ino: T;
    size: T;
    blocks: T;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    dev: T;
    mode: T;
    nlink: T;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export interface IStatFs<T = TStatNumber> {
    bavail: T;
    bfree: T;
    blocks: T;
    bsize: T;
    ffree: T;
    files: T;
    type: T;
}
export interface IDir {
    path: string;
    close(): Promise<void>;
    close(callback?: (err?: Error) => void): void;
    closeSync(): void;
    read(): Promise<IDirent | null>;
    read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
    readSync(): IDirent | null;
    [Symbol.asyncIterator](): AsyncIterableIterator<IDirent>;
}
export interface IDirent {
    name: TDataOut;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export interface IStatWatcher extends EventEmitter {
    filename: string;
    interval: number;
    timeoutRef?: any;
    setTimeout: TSetTimeout;
    prev: IStats;
    start(path: string, persistent?: boolean, interval?: number): void;
    stop(): void;
}
export interface IReadStream extends Readable {
    bytesRead: number;
    path: string | Buffer;
    pending: boolean;
}
export interface IWriteStream extends Writable {
    bytesWritten: number;
    path: string;
    pending: boolean;
    close(callback?: (err?: Error) => void): void;
}
export interface IFSWatcher extends EventEmitter {
    start(path: PathLike, persistent?: boolean, recursive?: boolean, encoding?: BufferEncoding): void;
    close(): void;
}
/**
 * Declare ReadableStream in case dom.d.ts is not added to the tsconfig lib causing
 * ReadableStream interface is not defined. For developers with dom.d.ts added,
 * the ReadableStream interface will be merged correctly.
 */
declare global {
    export interface ReadableStream {
    }
}
export interface IFileHandle extends EventEmitter {
    fd: number;
    getAsyncId(): number;
    appendFile(data: TData, options?: IAppendFileOptions | string): Promise<void>;
    chmod(mode: TMode): Promise<void>;
    chown(uid: number, gid: number): Promise<void>;
    close(): Promise<void>;
    createReadStream(options: IFileHandleReadStreamOptions): IReadStream;
    createWriteStream(options: IFileHandleWriteStreamOptions): IWriteStream;
    datasync(): Promise<void>;
    readableWebStream(options?: IReadableWebStreamOptions): ReadableStream;
    read(buffer: Buffer | Uint8Array, offset: number, length: number, position?: number | null): Promise<TFileHandleReadResult>;
    readv(buffers: ArrayBufferView[], position?: number | null): Promise<TFileHandleReadvResult>;
    readFile(options?: IReadFileOptions | string): Promise<TDataOut>;
    stat(options?: IStatOptions): Promise<IStats>;
    truncate(len?: number): Promise<void>;
    utimes(atime: TTime, mtime: TTime): Promise<void>;
    write(buffer: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number | null): Promise<TFileHandleWriteResult>;
    writev(buffers: ArrayBufferView[], position?: number | null): Promise<TFileHandleWritevResult>;
    writeFile(data: TData, options?: IWriteFileOptions): Promise<void>;
}
export type TFileHandle = PathLike | IFileHandle;
export interface TFileHandleReadResult {
    bytesRead: number;
    buffer: Buffer | Uint8Array;
}
export interface TFileHandleWriteResult {
    bytesWritten: number;
    buffer: Buffer | Uint8Array;
}
export interface TFileHandleReadvResult {
    bytesRead: number;
    buffers: ArrayBufferView[];
}
export interface TFileHandleWritevResult {
    bytesWritten: number;
    buffers: ArrayBufferView[];
}
export type AssertCallback<T> = T extends () => void ? T : never;
