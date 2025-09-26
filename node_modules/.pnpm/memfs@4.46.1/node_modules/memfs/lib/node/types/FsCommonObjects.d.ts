import type { constants } from '../../constants';
import type * as misc from './misc';
export interface FsCommonObjects {
    F_OK: number;
    R_OK: number;
    W_OK: number;
    X_OK: number;
    constants: typeof constants;
    Dir: new (...args: unknown[]) => misc.IDir;
    Dirent: new (...args: unknown[]) => misc.IDirent;
    FSWatcher: new (...args: unknown[]) => misc.IFSWatcher;
    ReadStream: new (...args: unknown[]) => misc.IReadStream;
    StatFs: new (...args: unknown[]) => misc.IStatFs;
    Stats: new (...args: unknown[]) => misc.IStats;
    StatsWatcher: new (...args: unknown[]) => misc.IStatWatcher;
    WriteStream: new (...args: unknown[]) => misc.IWriteStream;
}
