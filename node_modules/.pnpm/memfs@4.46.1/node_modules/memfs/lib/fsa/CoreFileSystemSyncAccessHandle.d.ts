import type { IFileSystemSyncAccessHandle, FileSystemReadWriteOptions, CoreFsaContext } from './types';
import type { Superblock } from '../core/Superblock';
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
 */
export declare class CoreFileSystemSyncAccessHandle implements IFileSystemSyncAccessHandle {
    private readonly _core;
    private readonly _path;
    private readonly _ctx;
    private _fd;
    private _closed;
    constructor(_core: Superblock, _path: string, _ctx: CoreFsaContext);
    private _ensureOpen;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/close
     */
    close(): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/flush
     */
    flush(): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/getSize
     */
    getSize(): Promise<number>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read
     */
    read(buffer: ArrayBuffer | ArrayBufferView, options?: FileSystemReadWriteOptions): Promise<number>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/truncate
     */
    truncate(newSize: number): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write
     */
    write(buffer: ArrayBuffer | ArrayBufferView | DataView, options?: FileSystemReadWriteOptions): Promise<number>;
}
