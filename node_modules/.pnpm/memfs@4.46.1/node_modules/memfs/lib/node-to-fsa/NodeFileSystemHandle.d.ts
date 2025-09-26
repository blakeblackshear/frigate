import { NodePermissionStatus } from './NodePermissionStatus';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor } from '../fsa/types';
import type { NodeFsaFs, NodeFsaContext } from './types';
/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export declare abstract class NodeFileSystemHandle implements IFileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    protected abstract readonly fs: NodeFsaFs;
    protected abstract readonly __path: string;
    protected abstract readonly ctx: NodeFsaContext;
    constructor(kind: 'file' | 'directory', name: string);
    /**
     * Compares two handles to see if the associated entries (either a file or directory) match.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
     */
    isSameEntry(fileSystemHandle: IFileSystemHandle): boolean;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
     */
    queryPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): Promise<NodePermissionStatus>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
     */
    remove({ recursive }?: {
        recursive?: boolean;
    }): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
     */
    requestPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): NodePermissionStatus;
}
