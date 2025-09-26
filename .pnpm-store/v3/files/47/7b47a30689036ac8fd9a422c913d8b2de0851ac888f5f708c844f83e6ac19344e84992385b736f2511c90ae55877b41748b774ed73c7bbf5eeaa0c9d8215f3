import type * as fsa from '../fsa/types';
import type * as misc from '../node/types/misc';
/**
 * Represents an open file. Stores additional metadata about the open file, such
 * as the seek position.
 */
export declare class FsaNodeFsOpenFile {
    readonly fd: number;
    readonly createMode: misc.TMode;
    readonly flags: number;
    readonly file: fsa.IFileSystemFileHandle;
    readonly filename: string;
    protected seek: number;
    /**
     * This influences the behavior of the next write operation. On the first
     * write we want to overwrite the file or keep the existing data, depending
     * with which flags the file was opened. On subsequent writes we want to
     * append to the file.
     */
    protected keepExistingData: boolean;
    constructor(fd: number, createMode: misc.TMode, flags: number, file: fsa.IFileSystemFileHandle, filename: string);
    close(): Promise<void>;
    write(data: ArrayBufferView, seek: number | null): Promise<void>;
}
