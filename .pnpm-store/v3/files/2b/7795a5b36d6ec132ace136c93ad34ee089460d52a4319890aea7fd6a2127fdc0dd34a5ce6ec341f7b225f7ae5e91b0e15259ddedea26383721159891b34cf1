import type { IReader, IReaderResettable, IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
import type { JsonPackExtension } from './JsonPackExtension';
import type { JsonPackValue } from './JsonPackValue';
export type JsonPrimitive = string | number | bigint | boolean | null;
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonObject = {
    [key: string]: JsonValue;
} | Readonly<{
    [key: string]: JsonValue;
}>;
export type TypedJsonValue<T> = T & JsonValue;
export type PackPrimitive = JsonPrimitive | undefined | Uint8Array | JsonPackValue | JsonPackExtension | bigint;
export type PackValue = PackPrimitive | PackArray | PackObject;
type PackArray = PackValue[] | readonly PackValue[];
type PackObject = {
    [key: string]: PackValue;
} | Readonly<{
    [key: string]: PackValue;
}>;
export interface BinaryJsonEncoder {
    writer: IWriter & IWriterGrowable;
    encode(value: unknown): Uint8Array;
    writeAny(value: unknown): void;
    writeNull(): void;
    writeBoolean(bool: boolean): void;
    writeNumber(num: number): void;
    writeInteger(int: number): void;
    writeUInteger(uint: number): void;
    writeFloat(float: number): void;
    writeBin(buf: Uint8Array): void;
    writeAsciiStr(str: string): void;
    writeStr(str: string): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
}
export interface StreamingBinaryJsonEncoder {
    writeStartStr(): void;
    writeStrChunk(str: string): void;
    writeEndStr(): void;
    writeStartBin(): void;
    writeBinChunk(buf: Uint8Array): void;
    writeEndBin(): void;
    writeStartArr(): void;
    writeArrChunk(item: unknown): void;
    writeEndArr(): void;
    writeStartObj(): void;
    writeObjChunk(key: string, value: unknown): void;
    writeEndObj(): void;
}
export interface TlvBinaryJsonEncoder {
    writeBinHdr(length: number): void;
    writeArrHdr(length: number): void;
    writeObjHdr(length: number): void;
}
export interface BinaryJsonDecoder {
    reader: IReader & IReaderResettable;
    decode(uint8: Uint8Array): unknown;
    read(uint8: Uint8Array): unknown;
    readAny(): unknown;
}
export {};
