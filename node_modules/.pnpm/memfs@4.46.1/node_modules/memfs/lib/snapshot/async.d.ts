import type { AsyncSnapshotOptions, SnapshotNode } from './types';
export declare const toSnapshot: ({ fs, path, separator }: AsyncSnapshotOptions) => Promise<SnapshotNode>;
export declare const fromSnapshot: (snapshot: SnapshotNode, { fs, path, separator }: AsyncSnapshotOptions) => Promise<void>;
