export interface IPermissionStatus {
    name: string;
    state: 'granted' | 'denied' | 'prompt';
}
export interface IFileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    isSameEntry(fileSystemHandle: IFileSystemHandle): boolean;
    queryPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): Promise<IPermissionStatus>;
    remove(options?: {
        recursive?: boolean;
    }): Promise<void>;
    requestPermission(fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor): IPermissionStatus;
}
export interface FileSystemHandlePermissionDescriptor {
    mode: 'read' | 'readwrite';
}
export interface IFileSystemDirectoryHandle extends IFileSystemHandle {
    keys(): AsyncIterableIterator<string>;
    entries(): AsyncIterableIterator<[string, IFileSystemHandle]>;
    values(): AsyncIterableIterator<IFileSystemHandle>;
    getDirectoryHandle(name: string, options?: GetDirectoryHandleOptions): Promise<IFileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: GetFileHandleOptions): Promise<IFileSystemFileHandle>;
    removeEntry(name: string, options?: RemoveEntryOptions): Promise<void>;
    resolve(possibleDescendant: IFileSystemHandle): Promise<string[] | null>;
}
/**
 * Context for Core FSA operations - similar to NodeFsaContext but for Superblock
 */
export interface CoreFsaContext {
    separator: '/' | '\\';
    /** Whether synchronous file handles are allowed. */
    syncHandleAllowed: boolean;
    /** Whether writes are allowed, defaults to `read`. */
    mode: 'read' | 'readwrite';
}
export interface CreateWritableOptions {
    keepExistingData?: boolean;
}
export interface GetDirectoryHandleOptions {
    /**
     * A boolean value, which defaults to `false`. When set to `true` if the directory
     * is not found, one with the specified name will be created and returned.
     */
    create?: boolean;
}
export interface GetFileHandleOptions {
    /**
     * A Boolean. Default `false`. When set to `true` if the file is not found,
     * one with the specified name will be created and returned.
     */
    create?: boolean;
}
export interface RemoveEntryOptions {
    /**
     * A boolean value, which defaults to `false`. When set to true entries will
     * be removed recursively.
     */
    recursive?: boolean;
}
export interface IFileSystemFileHandle extends IFileSystemHandle {
    getFile(): Promise<File>;
    createSyncAccessHandle: undefined | (() => Promise<IFileSystemSyncAccessHandle>);
    createWritable(options?: CreateWritableOptions): Promise<IFileSystemWritableFileStream>;
}
export interface CreateWritableOptions {
    keepExistingData?: boolean;
}
export interface IFileSystemSyncAccessHandle {
    close(): Promise<void>;
    flush(): Promise<void>;
    getSize(): Promise<number>;
    read(buffer: ArrayBuffer | ArrayBufferView, options?: FileSystemReadWriteOptions): Promise<number>;
    truncate(newSize: number): Promise<void>;
    write(buffer: ArrayBuffer | ArrayBufferView | DataView, options?: FileSystemReadWriteOptions): Promise<number>;
}
export interface FileSystemReadWriteOptions {
    /**
     * A number representing the offset in bytes that the file should be read from.
     */
    at?: number;
}
export interface IFileSystemWritableFileStream extends WritableStream {
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    write(chunk: Data): Promise<void>;
    write(params: FileSystemWritableFileStreamParams): Promise<void>;
}
export interface FileSystemWritableFileStreamParams {
    type: 'write' | 'truncate' | 'seek';
    data?: Data;
    position?: number;
    size?: number;
}
export type Data = ArrayBuffer | ArrayBufferView | Uint8Array | Uint8ClampedArray | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | BigUint64Array | BigInt64Array | DataView | Blob | string;
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemChangeRecord
 */
export interface IFileSystemChangeRecord {
    /**
     * A reference to the file system handle that the change was observed on. This
     * property will be null for records with a "disappeared", "errored", or
     * "unknown" type.
     */
    changedHandle: IFileSystemHandle | IFileSystemSyncAccessHandle | IFileSystemDirectoryHandle | null;
    /**
     * An array containing the path components that make up the relative file path
     * from the `root` to the `changedHandle`, including the `changedHandle`
     * filename.
     */
    relativePathComponents: string[];
    /**
     * An array containing the path components that make up the relative file path
     * from the `root` to the `changedHandle`'s former location, in the case of
     * observations with a `"moved"` type. If the type is not `"moved"`, this
     * property will be `null`.
     */
    relativePathMovedFrom: string[] | null;
    /**
     * A reference to the root file system handle, that is, the one passed to the
     * `observe()` call that started the observation.
     */
    root: IFileSystemHandle | IFileSystemSyncAccessHandle | IFileSystemDirectoryHandle;
    /**
     * The type of change that occurred.
     */
    type: 'appeared'
    /**
     * The file or directory was deleted or moved out of the root file structure.
     * To find out which file or directory `disappeared`, you can query the
     * `relativePathComponents` property.
     */
     | 'disappeared'
    /** An error state occurred in the observed directory. */
     | 'errored'
    /** The file or directory was modified. */
     | 'modified'
    /**
     * The file or directory was moved within the root file structure.
     *
     * Chrome note: On Windows, "moved" observations aren't supported between
     * directories. They are reported as a "disappeared" observation in the
     * source directory and an "appeared" observation in the destination directory.
     */
     | 'moved'
    /**
     * Indicates that some observations were missed. If you wish to find out
     * information on what changed in the missed observations, you could fall
     * back to polling the observed directory.
     */
     | 'unknown';
}
export interface IFileSystemObserverObserveOptions {
    /** Whether to observe changes recursively in subdirectories. */
    recursive?: boolean;
}
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
 */
export interface IFileSystemObserver {
    /**
     * Start observing changes to a given file or directory.
     *
     * @param handle The file or directory handle to observe.
     * @param options Optional settings for the observation.
     */
    observe(handle: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle, options?: IFileSystemObserverObserveOptions): Promise<void>;
    /** Disconnect and stop all observations. */
    disconnect(): void;
}
export interface IFileSystemObserverConstructable {
    /**
     * Constructor for creating a FileSystemObserver.
     *
     * @param callback Function called with file system change records and the
     *     observer instance
     */
    new (callback: (records: IFileSystemChangeRecord[], observer: IFileSystemObserver) => void): IFileSystemObserver;
}
