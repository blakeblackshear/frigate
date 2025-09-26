import { CoreFileSystemDirectoryHandle } from './CoreFileSystemDirectoryHandle';
import { CoreFsaContext, IFileSystemObserverConstructable } from './types';
import { Superblock } from '../core/Superblock';
export * from './types';
export * from './CoreFileSystemHandle';
export * from './CoreFileSystemDirectoryHandle';
export * from './CoreFileSystemFileHandle';
export * from './CoreFileSystemSyncAccessHandle';
export * from './CoreFileSystemWritableFileStream';
export * from './CoreFileSystemObserver';
export * from './CorePermissionStatus';
/**
 * Create a new instance of an in-memory File System Access API
 * implementation rooted at the root directory of the filesystem.
 *
 * @param ctx Optional context for the File System Access API.
 * @param core Optional low-level file system implementation to
 *     back the File System Access API. If not provided, a new empty
 *     Superblock instance will be created.
 * @param dirPath Optional path within the filesystem to use as the root
 *     directory of the File System Access API. Defaults to `/`.
 * @returns A File System Access API implementation `dir` rooted at
 *     the root directory of the filesystem, as well as the `core`,
 *     a low-level file system implementation itself. Also, returns
 *     `FileSystemObserver`, a class that can be used to create
 *     observers that watch for changes to files and directories.
 */
export declare const fsa: (ctx?: Partial<CoreFsaContext>, core?: Superblock, dirPath?: string) => {
    core: Superblock;
    dir: CoreFileSystemDirectoryHandle;
    FileSystemObserver: IFileSystemObserverConstructable;
};
