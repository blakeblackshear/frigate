import type { AsyncSnapshotOptions, SnapshotNode, SnapshotOptions } from './types';
/** @todo Import this type from `json-joy` once it is available. */
export type JsonUint8Array<T> = Uint8Array & {
    __BRAND__: 'json';
    __TYPE__: T;
};
export declare const toJsonSnapshotSync: (options: SnapshotOptions) => JsonUint8Array<SnapshotNode>;
export declare const fromJsonSnapshotSync: (uint8: JsonUint8Array<SnapshotNode>, options: SnapshotOptions) => void;
export declare const toJsonSnapshot: (options: AsyncSnapshotOptions) => Promise<JsonUint8Array<SnapshotNode>>;
export declare const fromJsonSnapshot: (uint8: JsonUint8Array<SnapshotNode>, options: AsyncSnapshotOptions) => Promise<void>;
