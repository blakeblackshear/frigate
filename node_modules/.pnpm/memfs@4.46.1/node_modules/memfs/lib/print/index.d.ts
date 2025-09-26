import type { FsSynchronousApi } from '../node/types';
export declare const toTreeSync: (fs: FsSynchronousApi, opts?: ToTreeOptions) => string;
export interface ToTreeOptions {
    dir?: string;
    tab?: string;
    depth?: number;
    separator?: '/' | '\\';
}
