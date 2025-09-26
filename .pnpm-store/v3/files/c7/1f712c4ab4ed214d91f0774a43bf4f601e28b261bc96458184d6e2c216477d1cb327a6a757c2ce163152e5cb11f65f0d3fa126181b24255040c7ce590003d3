import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
import type { BinaryJsonEncoder } from '../types';
export declare class BencodeEncoder implements BinaryJsonEncoder {
    readonly writer: IWriter & IWriterGrowable;
    constructor(writer: IWriter & IWriterGrowable);
    encode(value: unknown): Uint8Array;
    writeUnknown(value: unknown): void;
    writeAny(value: unknown): void;
    writeNull(): void;
    writeUndef(): void;
    writeBoolean(bool: boolean): void;
    writeNumber(num: number): void;
    writeInteger(int: number): void;
    writeUInteger(uint: number): void;
    writeFloat(float: number): void;
    writeBigint(int: bigint): void;
    writeBin(buf: Uint8Array): void;
    writeStr(str: string): void;
    writeAsciiStr(str: string): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
    writeMap(obj: Map<unknown, unknown>): void;
    writeSet(set: Set<unknown>): void;
}
