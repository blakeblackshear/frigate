import type { CborUint8Array } from '@jsonjoy.com/json-pack/lib/cbor/types';
import type { AsyncSnapshotOptions, SnapshotNode, SnapshotOptions } from './types';
export declare const toBinarySnapshotSync: (options: SnapshotOptions) => CborUint8Array<SnapshotNode>;
export declare const fromBinarySnapshotSync: (uint8: CborUint8Array<SnapshotNode>, options: SnapshotOptions) => void;
export declare const toBinarySnapshot: (options: AsyncSnapshotOptions) => Promise<CborUint8Array<SnapshotNode>>;
export declare const fromBinarySnapshot: (uint8: CborUint8Array<SnapshotNode>, options: AsyncSnapshotOptions) => Promise<void>;
