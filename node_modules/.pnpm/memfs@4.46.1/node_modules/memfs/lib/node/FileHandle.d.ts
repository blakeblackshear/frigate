import { EventEmitter } from '../vendor/node/events';
import type * as opts from './types/options';
import type { IFileHandle, IReadStream, IWriteStream, IStats, TData, TDataOut, TMode, TTime } from './types/misc';
import type { FsCallbackApi } from './types';
export declare class FileHandle extends EventEmitter implements IFileHandle {
    private fs;
    private refs;
    private closePromise;
    private closeResolve?;
    private closeReject?;
    private position;
    private readableWebStreamLocked;
    fd: number;
    constructor(fs: FsCallbackApi, fd: number);
    getAsyncId(): number;
    appendFile(data: TData, options?: opts.IAppendFileOptions | string): Promise<void>;
    chmod(mode: TMode): Promise<void>;
    chown(uid: number, gid: number): Promise<void>;
    close(): Promise<void>;
    datasync(): Promise<void>;
    createReadStream(options: opts.IFileHandleReadStreamOptions): IReadStream;
    createWriteStream(options: opts.IFileHandleWriteStreamOptions): IWriteStream;
    readableWebStream(options?: opts.IReadableWebStreamOptions): ReadableStream;
    read(buffer: Buffer | Uint8Array, offset: number, length: number, position?: number | null): Promise<TFileHandleReadResult>;
    readv(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleReadvResult>;
    readFile(options?: opts.IReadFileOptions | string): Promise<TDataOut>;
    stat(options?: opts.IFStatOptions): Promise<IStats>;
    sync(): Promise<void>;
    truncate(len?: number): Promise<void>;
    utimes(atime: TTime, mtime: TTime): Promise<void>;
    write(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number | null): Promise<TFileHandleWriteResult>;
    writev(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleWritevResult>;
    writeFile(data: TData, options?: opts.IWriteFileOptions): Promise<void>;
    private ref;
    private unref;
}
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
