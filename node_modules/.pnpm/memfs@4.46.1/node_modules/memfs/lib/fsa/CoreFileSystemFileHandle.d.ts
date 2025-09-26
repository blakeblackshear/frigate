import { CoreFileSystemHandle } from './CoreFileSystemHandle';
import { CoreFileSystemWritableFileStream } from './CoreFileSystemWritableFileStream';
import type { CoreFsaContext, CreateWritableOptions, IFileSystemFileHandle, IFileSystemSyncAccessHandle } from './types';
import type { Superblock } from '../core/Superblock';
export declare class CoreFileSystemFileHandle extends CoreFileSystemHandle implements IFileSystemFileHandle {
    protected readonly _core: Superblock;
    readonly __path: string;
    protected readonly ctx: CoreFsaContext;
    constructor(_core: Superblock, __path: string, ctx?: Partial<CoreFsaContext>);
    /**
     * Returns a {@link Promise} which resolves to a {@link File} object
     * representing the state on disk of the entry represented by the handle.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile
     */
    getFile(): Promise<File>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
     */
    get createSyncAccessHandle(): undefined | (() => Promise<IFileSystemSyncAccessHandle>);
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
     */
    createWritable({ keepExistingData }?: CreateWritableOptions): Promise<CoreFileSystemWritableFileStream>;
}
