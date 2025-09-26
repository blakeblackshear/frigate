declare const toUTF8String: (input: Uint8Array, start?: number, end?: number) => string;
declare const toHexString: (input: Uint8Array, start?: number, end?: number) => string;
declare const readInt16LE: (input: Uint8Array, offset?: number) => number;
declare const readUInt16BE: (input: Uint8Array, offset?: number) => number;
declare const readUInt16LE: (input: Uint8Array, offset?: number) => number;
declare const readUInt24LE: (input: Uint8Array, offset?: number) => number;
declare const readInt32LE: (input: Uint8Array, offset?: number) => number;
declare const readUInt32BE: (input: Uint8Array, offset?: number) => number;
declare const readUInt32LE: (input: Uint8Array, offset?: number) => number;
declare const readUInt64: (input: Uint8Array, offset: number, isBigEndian: boolean) => bigint;
declare function readUInt(input: Uint8Array, bits: 16 | 32, offset?: number, isBigEndian?: boolean): number;
declare function findBox(input: Uint8Array, boxName: string, currentOffset: number): {
    name: string;
    offset: number;
    size: number;
} | undefined;

export { findBox, readInt16LE, readInt32LE, readUInt, readUInt16BE, readUInt16LE, readUInt24LE, readUInt32BE, readUInt32LE, readUInt64, toHexString, toUTF8String };
