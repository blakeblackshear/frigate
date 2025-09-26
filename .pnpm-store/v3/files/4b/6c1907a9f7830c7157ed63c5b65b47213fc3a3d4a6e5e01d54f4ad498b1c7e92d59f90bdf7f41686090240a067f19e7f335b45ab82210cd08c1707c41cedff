import type { IFileSystemChangeRecord, IFileSystemDirectoryHandle, IFileSystemFileHandle, IFileSystemObserver, IFileSystemObserverObserveOptions, IFileSystemSyncAccessHandle } from './types';
import type { Superblock } from '../core';
export declare class CoreFileSystemObserver implements IFileSystemObserver {
    protected readonly _core: Superblock;
    protected readonly callback: (records: IFileSystemChangeRecord[], observer: IFileSystemObserver) => void;
    constructor(_core: Superblock, callback: (records: IFileSystemChangeRecord[], observer: IFileSystemObserver) => void);
    observe(handle: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle, options?: IFileSystemObserverObserveOptions): Promise<void>;
    /** Disconnect and stop all observations. */
    disconnect(): void;
}
