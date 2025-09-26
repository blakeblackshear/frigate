import { NodeFileSystemHandle } from './NodeFileSystemHandle';
import { NodeFileSystemWritableFileStream } from './NodeFileSystemWritableFileStream';
import type { NodeFsaContext, NodeFsaFs } from './types';
import type { IFileSystemFileHandle, IFileSystemSyncAccessHandle } from '../fsa/types';
export declare class NodeFileSystemFileHandle extends NodeFileSystemHandle implements IFileSystemFileHandle {
    protected readonly fs: NodeFsaFs;
    readonly __path: string;
    protected readonly ctx: NodeFsaContext;
    constructor(fs: NodeFsaFs, __path: string, ctx?: Partial<NodeFsaContext>);
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
    createWritable({ keepExistingData }?: CreateWritableOptions): Promise<NodeFileSystemWritableFileStream>;
}
export interface CreateWritableOptions {
    keepExistingData?: boolean;
}
