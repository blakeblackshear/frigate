import type { FsPromisesApi, FsSynchronousApi } from '../node/types';
import type { FsCommonObjects } from '../node/types/FsCommonObjects';
/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type NodeFsaFs = Pick<FsCommonObjects, 'constants'> & {
    promises: FsPromisesApi;
} & Pick<FsSynchronousApi, 'openSync' | 'fsyncSync' | 'statSync' | 'closeSync' | 'readSync' | 'truncateSync' | 'writeSync' | 'accessSync'>;
export interface NodeFsaContext {
    separator: '/' | '\\';
    /** Whether synchronous file handles are allowed. */
    syncHandleAllowed: boolean;
    /** Whether writes are allowed, defaults to `read`. */
    mode: 'read' | 'readwrite';
}
