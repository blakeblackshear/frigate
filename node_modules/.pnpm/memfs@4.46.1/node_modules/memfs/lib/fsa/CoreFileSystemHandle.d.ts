import { CorePermissionStatus } from './CorePermissionStatus';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor, CoreFsaContext } from './types';
/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a core `Superblock`.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export declare abstract class CoreFileSystemHandle implements IFileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    protected readonly ctx: CoreFsaContext;
    constructor(kind: 'file' | 'directory', name: string, ctx: CoreFsaContext);
    /**
     * Compares two handles to see if the associated entries (either a file or directory) match.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
     */
    isSameEntry(fileSystemHandle: CoreFileSystemHandle): boolean;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
     */
    queryPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): Promise<CorePermissionStatus>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
     */
    remove({ recursive }?: {
        recursive?: boolean;
    }): Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
     */
    requestPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): CorePermissionStatus;
}
