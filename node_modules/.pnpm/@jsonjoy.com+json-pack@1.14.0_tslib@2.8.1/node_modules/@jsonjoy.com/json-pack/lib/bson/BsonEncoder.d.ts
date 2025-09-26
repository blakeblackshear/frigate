import { BsonObjectId } from './values';
import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
import type { BinaryJsonEncoder } from '../types';
export declare class BsonEncoder implements BinaryJsonEncoder {
    readonly writer: IWriter & IWriterGrowable;
    constructor(writer: IWriter & IWriterGrowable);
    encode(value: unknown): Uint8Array;
    writeAny(value: unknown): void;
    writeNull(): void;
    writeUndef(): void;
    writeBoolean(bool: boolean): void;
    writeNumber(num: number): void;
    writeInteger(int: number): void;
    writeUInteger(uint: number): void;
    writeInt32(int: number): void;
    writeInt64(int: number | bigint): void;
    writeFloat(float: number): void;
    writeBigInt(int: bigint): void;
    writeBin(buf: Uint8Array): void;
    writeStr(str: string): void;
    writeAsciiStr(str: string): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
    writeCString(str: string): void;
    writeObjectId(id: BsonObjectId): void;
    writeKey(key: string, value: unknown): void;
}
