import { SyncMessenger } from './SyncMessenger';
import type * as fsa from '../../fsa/types';
import type { FsaNodeSyncAdapter, FsaNodeSyncAdapterApi } from '../types';
export declare class FsaNodeSyncAdapterWorker implements FsaNodeSyncAdapter {
    protected readonly messenger: SyncMessenger;
    protected readonly root: fsa.IFileSystemDirectoryHandle;
    static start(url: string, dir: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>): Promise<FsaNodeSyncAdapterWorker>;
    constructor(messenger: SyncMessenger, root: fsa.IFileSystemDirectoryHandle);
    call<K extends keyof FsaNodeSyncAdapterApi>(method: K, payload: Parameters<FsaNodeSyncAdapterApi[K]>[0]): ReturnType<FsaNodeSyncAdapterApi[K]>;
}
