import type { FileSystemReadWriteOptions, IFileSystemSyncAccessHandle } from '../fsa/types';
import type { NodeFsaContext, NodeFsaFs } from './types';
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
 */
export declare class NodeFileSystemSyncAccessHandle implements IFileSystemSyncAccessHandle {
    protected readonly fs: NodeFsaFs;
    protected readonly path: string;
    protected readonly ctx: NodeFsaContext;
    protected readonly fd: number;
    constructor(fs: NodeFsaFs, path: string, ctx: NodeFsaContext);
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
     * @param newSize The number of bytes to resize the file to.
     */
    truncate(newSize: number): Promise<void>;
    /**
     * Writes the content of a specified buffer to the file associated with the
     * handle, optionally at a given offset.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write
     * @param buffer
     * @param options
     */
    write(buffer: ArrayBuffer | ArrayBufferView | DataView, options?: FileSystemReadWriteOptions): Promise<number>;
}
