import { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import type * as fsa from '../fsa/types';
import type * as misc from '../node/types/misc';
import type { FsaNodeSyncAdapter } from './types';
export declare class FsaNodeCore {
    protected readonly root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>;
    syncAdapter?: FsaNodeSyncAdapter | undefined;
    protected static fd: number;
    protected readonly fds: Map<number, FsaNodeFsOpenFile>;
    constructor(root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>, syncAdapter?: FsaNodeSyncAdapter | undefined);
    protected getSyncAdapter(): FsaNodeSyncAdapter;
    /**
     * A list of reusable (opened and closed) file descriptors, that should be
     * used first before creating a new file descriptor.
     */
    releasedFds: number[];
    protected newFdNumber(): number;
    /**
     * @param path Path from root to the new folder.
     * @param create Whether to create the folders if they don't exist.
     */
    protected getDir(path: string[], create: boolean, funcName?: string): Promise<fsa.IFileSystemDirectoryHandle>;
    protected getFile(path: string[], name: string, funcName?: string, create?: boolean): Promise<fsa.IFileSystemFileHandle>;
    protected getFileOrDir(path: string[], name: string, funcName?: string): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle>;
    protected getFileByFd(fd: number, funcName?: string): FsaNodeFsOpenFile;
    protected getFileByFdAsync(fd: number, funcName?: string): Promise<FsaNodeFsOpenFile>;
    __getFileById(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle>;
    protected getFileByIdOrCreate(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle>;
    protected __open(filename: string, flags: number, mode: number): Promise<FsaNodeFsOpenFile>;
    protected __open2(fsaFile: fsa.IFileSystemFileHandle, filename: string, flags: number, mode: number): FsaNodeFsOpenFile;
    protected __close(fd: number): Promise<void>;
    protected getFileName(id: misc.TFileId): string;
}
