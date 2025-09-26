import { NodeFileSystemHandle } from './NodeFileSystemHandle';
import type { NodeFsaContext, NodeFsaFs } from './types';
import type { GetDirectoryHandleOptions, GetFileHandleOptions, IFileSystemDirectoryHandle, IFileSystemFileHandle, IFileSystemHandle, RemoveEntryOptions } from '../fsa/types';
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export declare class NodeFileSystemDirectoryHandle extends NodeFileSystemHandle implements IFileSystemDirectoryHandle {
    protected readonly fs: NodeFsaFs;
    protected readonly ctx: NodeFsaContext;
    /** Directory path with trailing slash. */
    readonly __path: string;
    constructor(fs: NodeFsaFs, path: string, ctx?: Partial<NodeFsaContext>);
    /**
     * Returns a new array iterator containing the keys for each item in
     * {@link NodeFileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
     */
    keys(): AsyncIterableIterator<string>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
     */
    entries(): AsyncIterableIterator<[string, NodeFileSystemHandle]>;
    /**
     * Returns a new array iterator containing the values for each index in the
     * {@link FileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
     */
    values(): AsyncIterableIterator<NodeFileSystemHandle>;
    /**
     * Returns a {@link NodeFileSystemDirectoryHandle} for a subdirectory with the specified
     * name within the directory handle on which the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
     * @param name A string representing the {@link NodeFileSystemHandle} name of
     *        the subdirectory you wish to retrieve.
     * @param options An optional object containing options for the retrieved
     *        subdirectory.
     */
    getDirectoryHandle(name: string, options?: GetDirectoryHandleOptions): Promise<IFileSystemDirectoryHandle>;
    /**
     * Returns a {@link FileSystemFileHandle} for a file with the specified name,
     * within the directory the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
     * @param name A string representing the {@link NodeFileSystemHandle} name of
     *        the file you wish to retrieve.
     * @param options An optional object containing options for the retrieved file.
     */
    getFileHandle(name: string, options?: GetFileHandleOptions): Promise<IFileSystemFileHandle>;
    /**
     * Attempts to remove an entry if the directory handle contains a file or
     * directory called the name specified.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
     * @param name A string representing the {@link FileSystemHandle} name of the
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
     * @param possibleDescendant The {@link IFileSystemHandle} from which
     *        to return the relative path.
     */
    resolve(possibleDescendant: IFileSystemHandle): Promise<string[] | null>;
}
