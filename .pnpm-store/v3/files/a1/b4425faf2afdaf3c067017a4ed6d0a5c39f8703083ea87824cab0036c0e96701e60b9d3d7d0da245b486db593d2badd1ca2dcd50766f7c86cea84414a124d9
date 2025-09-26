import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
import type { BinaryJsonEncoder } from '../types';
export declare class XdrEncoder implements BinaryJsonEncoder {
    readonly writer: IWriter & IWriterGrowable;
    constructor(writer: IWriter & IWriterGrowable);
    encode(value: unknown): Uint8Array;
    writeUnknown(value: unknown): void;
    writeAny(value: unknown): void;
    writeVoid(): void;
    writeNull(): void;
    writeBoolean(bool: boolean): void;
    writeInt(int: number): void;
    writeUnsignedInt(uint: number): void;
    writeHyper(hyper: number | bigint): void;
    writeUnsignedHyper(uhyper: number | bigint): void;
    writeFloat(float: number): void;
    writeDouble(double: number): void;
    writeQuadruple(quad: number): void;
    writeOpaque(data: Uint8Array): void;
    writeVarlenOpaque(data: Uint8Array): void;
    writeStr(str: string): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
    writeNumber(num: number): void;
    writeInteger(int: number): void;
    writeUInteger(uint: number): void;
    writeBin(buf: Uint8Array): void;
    writeAsciiStr(str: string): void;
}
