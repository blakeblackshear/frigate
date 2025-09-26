import { Reader } from '@jsonjoy.com/buffers/lib/Reader';
import type { BinaryJsonDecoder } from '../types';
export declare class AvroDecoder implements BinaryJsonDecoder {
    reader: Reader;
    read(uint8: Uint8Array): unknown;
    decode(uint8: Uint8Array): unknown;
    readAny(): unknown;
    readNull(): null;
    readBoolean(): boolean;
    readInt(): number;
    readLong(): number | bigint;
    readFloat(): number;
    readDouble(): number;
    readBytes(): Uint8Array;
    readString(): string;
    readArray<T>(itemReader: () => T): T[];
    readMap<T>(valueReader: () => T): Record<string, T>;
    readUnion<T>(schemaReaders: Array<() => T>): {
        index: number;
        value: T;
    };
    readEnum(): number;
    readFixed(size: number): Uint8Array;
    readRecord<T>(fieldReaders: Array<() => any>): T;
    private readVarIntUnsigned;
    private readVarLong;
    private decodeZigZag32;
    private decodeZigZag64;
}
