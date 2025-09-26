import { Writable } from '../vendor/node/stream';
import { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import type { IFileSystemWritableFileStream } from '../fsa/types';
import type { IWriteStream } from '../node/types/misc';
import type { IWriteStreamOptions } from '../node/types/options';
/**
 * This WriteStream implementation does not build on top of the `fs` module,
 * but instead uses the lower-level `FileSystemFileHandle` interface. The reason
 * is the different semantics in `fs` and FSA (File System Access API) write streams.
 *
 * When data is written to an FSA file, a new FSA stream is created, it copies
 * the file to a temporary swap file. After each written chunk, that swap file
 * is closed and the original file is replaced with the swap file. This means,
 * if WriteStream was built on top of `fs`, each chunk write would result in
 * a file copy, write, close, rename operations, which is not what we want.
 *
 * Instead this implementation hooks into the lower-level and closes the swap
 * file only once the stream is closed. The downside is that the written data
 * is not immediately visible to other processes (because it is written to the
 * swap file), but that is the trade-off we have to make.
 *
 * @todo Could make this flush the data to the original file periodically, so that
 *       the data is visible to other processes.
 * @todo This stream could work through `FileSystemSyncAccessHandle.write` in a
 *       Worker thread instead.
 */
export declare class FsaNodeWriteStream extends Writable implements IWriteStream {
    readonly path: string;
    protected readonly options: IWriteStreamOptions;
    protected __pending__: boolean;
    protected __closed__: boolean;
    protected __bytes__: number;
    protected readonly __stream__: Promise<IFileSystemWritableFileStream>;
    protected readonly __mutex__: <T = unknown>(code: import("thingies").Code<T>) => Promise<T>;
    constructor(handle: Promise<FsaNodeFsOpenFile>, path: string, options: IWriteStreamOptions);
    private ___write___;
    private __close__;
    get bytesWritten(): number;
    get pending(): boolean;
    close(cb: any): void;
    _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void;
    _writev(chunks: Array<{
        chunk: any;
        encoding: string;
    }>, callback: (error?: Error | null) => void): void;
    _final(callback: (error?: Error | null) => void): void;
}
