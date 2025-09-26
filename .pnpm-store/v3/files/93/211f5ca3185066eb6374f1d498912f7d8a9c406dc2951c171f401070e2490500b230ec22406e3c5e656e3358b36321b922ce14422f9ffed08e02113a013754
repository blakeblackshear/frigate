import type { Data, FileSystemWritableFileStreamParams, IFileSystemWritableFileStream } from '../fsa/types';
import type { IFileHandle } from '../node/types/misc';
import type { NodeFsaFs } from './types';
/**
 * When Chrome writes to the file, it creates a copy of the file with extension
 * `.crswap` and then replaces the original file with the copy only when the
 * `close()` method is called. If the `abort()` method is called, the `.crswap`
 * file is deleted.
 *
 * If a file name with with extension `.crswap` is already taken, it
 * creates a new swap file with extension `.1.crswap` and so on.
 */
export declare const createSwapFile: (fs: NodeFsaFs, path: string, keepExistingData: boolean) => Promise<[handle: IFileHandle, path: string]>;
interface SwapFile {
    /** Swap file full path name. */
    path: string;
    /** Seek offset in the file. */
    offset: number;
    /** Node.js open FileHandle. */
    handle?: IFileHandle;
    /** Resolves when swap file is ready for operations. */
    ready?: Promise<void>;
}
declare const WS: typeof WritableStream;
/**
 * Is a WritableStream object with additional convenience methods, which
 * operates on a single file on disk. The interface is accessed through the
 * `FileSystemFileHandle.createWritable()` method.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export declare class NodeFileSystemWritableFileStream extends WS implements IFileSystemWritableFileStream {
    protected readonly fs: NodeFsaFs;
    protected readonly path: string;
    protected readonly swap: SwapFile;
    constructor(fs: NodeFsaFs, path: string, keepExistingData: boolean);
    /**
     * @sse https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
     * @param position An `unsigned long` describing the byte position from the top
     *                 (beginning) of the file.
     */
    seek(position: number): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
     * @param size An `unsigned long` of the amount of bytes to resize the stream to.
     */
    truncate(size: number): Promise<void>;
    protected writeBase(chunk: Data): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
     */
    write(chunk: Data): Promise<void>;
    write(params: FileSystemWritableFileStreamParams): Promise<void>;
}
export {};
