import { AsyncCallback, SyncMessenger } from './SyncMessenger';
import { FsaNodeFs } from '../FsaNodeFs';
import type * as fsa from '../../fsa/types';
import type { FsaNodeWorkerMsg } from './types';
import type { FsaNodeSyncAdapterApi } from '../types';
export declare class FsaNodeSyncWorker {
    protected readonly sab: SharedArrayBuffer;
    protected readonly messenger: SyncMessenger;
    protected root: fsa.IFileSystemDirectoryHandle;
    protected fs: FsaNodeFs;
    start(): void;
    protected onPostMessage: (msg: FsaNodeWorkerMsg) => void;
    protected readonly onRequest: AsyncCallback;
    protected getDir(path: string[], create: boolean, funcName?: string): Promise<fsa.IFileSystemDirectoryHandle>;
    protected getFile(path: string[], name: string, funcName?: string, create?: boolean): Promise<fsa.IFileSystemFileHandle>;
    protected getFileOrDir(path: string[], name: string, funcName?: string, create?: boolean): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle>;
    protected handlers: {
        [K in keyof FsaNodeSyncAdapterApi]: (request: Parameters<FsaNodeSyncAdapterApi[K]>[0]) => Promise<ReturnType<FsaNodeSyncAdapterApi[K]>>;
    };
}
