import type { IFileSystemWritableFileStream, FileSystemWritableFileStreamParams, Data } from './types';
import type { Superblock } from '../core/Superblock';
declare const WS: typeof WritableStream;
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export declare class CoreFileSystemWritableFileStream extends WS implements IFileSystemWritableFileStream {
    private _fd;
    private _position;
    private _closed;
    private readonly _core;
    private readonly _path;
    constructor(core: Superblock, path: string, keepExistingData?: boolean);
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
     */
    seek(position: number): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
     */
    truncate(size: number): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
     */
    write(chunk: Data): Promise<void>;
    write(params: FileSystemWritableFileStreamParams): Promise<void>;
    private _write;
    private _isParams;
    private _dataToBuffer;
}
export {};
