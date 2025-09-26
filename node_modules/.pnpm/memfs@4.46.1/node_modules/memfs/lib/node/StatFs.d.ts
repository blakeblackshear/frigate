import { Superblock } from '../core';
import type { IStatFs } from './types/misc';
export type TStatNumber = number | bigint;
/**
 * Statistics about a file system, like `fs.StatFs`.
 */
export declare class StatFs<T = TStatNumber> implements IStatFs<T> {
    static build(superblock: Superblock, bigint: false): StatFs<number>;
    static build(superblock: Superblock, bigint: true): StatFs<bigint>;
    static build(superblock: Superblock, bigint?: boolean): StatFs<TStatNumber>;
    type: T;
    bsize: T;
    blocks: T;
    bfree: T;
    bavail: T;
    files: T;
    ffree: T;
}
export default StatFs;
