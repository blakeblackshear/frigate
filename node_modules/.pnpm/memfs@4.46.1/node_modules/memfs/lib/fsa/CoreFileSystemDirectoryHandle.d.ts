import { CoreFileSystemHandle } from './CoreFileSystemHandle';
import type { CoreFsaContext, GetDirectoryHandleOptions, GetFileHandleOptions, IFileSystemDirectoryHandle, IFileSystemFileHandle, IFileSystemHandle, RemoveEntryOptions } from './types';
import type { Superblock } from '../core/Superblock';
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export declare class CoreFileSystemDirectoryHandle extends CoreFileSystemHandle implements IFileSystemDirectoryHandle {
    protected readonly _core: Superblock;
    protected readonly ctx: CoreFsaContext;
    /** Directory path with trailing slash. */
    readonly __path: string;
    constructor(_core: Superblock, path: string, ctx?: Partial<CoreFsaContext>);
    /**
     * Returns a new array iterator containing the keys for each item in
     * {@link CoreFileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
     */
    keys(): AsyncIterableIterator<string>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
     */
    entries(): AsyncIterableIterator<[string, CoreFileSystemHandle]>;
    /**
     * Returns a new array iterator containing the values for each index in the
     * {@link FileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
     */
    values(): AsyncIterableIterator<CoreFileSystemHandle>;
    /**
     * Returns a {@link CoreFileSystemDirectoryHandle} for a subdirectory with the specified
     * name within the directory handle on which the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
     * @param name A string representing the {@link CoreFileSystemHandle} name of
     *        the subdirectory you wish to retrieve.
     * @param options An optional object containing options for the retrieved
     *        subdirectory.
     */
    getDirectoryHandle(name: string, options?: GetDirectoryHandleOptions): Promise<IFileSystemDirectoryHandle>;
    /**
     * Returns a {@link CoreFileSystemFileHandle} for a file with the specified name,
     * within the directory the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
     * @param name A string representing the {@link CoreFileSystemHandle} name of
     *        the file you wish to retrieve.
     * @param options An optional object containing options for the retrieved file.
     */
    getFileHandle(name: string, options?: GetFileHandleOptions): Promise<IFileSystemFileHandle>;
    /**
     * Attempts to remove an entry if the directory handle contains a file or
     * directory called the name specified.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
     * @param name A string representing the {@link CoreFileSystemHandle} name of the
     *        entry you wish to remove.
     * @param options An optional object containing options.
     */
    removeEntry(name: string, { recursive }?: RemoveEntryOptions): Promise<void>;
    /**
     * The `resolve()` method of the {@link FileSystemDirectoryHandle} interface
     * returns an {@link Array} of directory names from the parent handle to the specified
     * child entry, with the name of the child entry as the last array item.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/resolve
     * @param possibleDescendant The {@link CoreFileSystemHandle} from which
     *        to return the relative path.
     */
    resolve(possibleDescendant: IFileSystemHandle): Promise<string[] | null>;
    private _handleError;
}
