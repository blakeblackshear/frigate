import { BsonBinary, BsonDbPointer, BsonDecimal128, BsonJavascriptCodeWithScope, BsonObjectId, BsonTimestamp } from './values';
import type { IReader, IReaderResettable } from '@jsonjoy.com/buffers/lib';
import type { BinaryJsonDecoder } from '../types';
export declare class BsonDecoder implements BinaryJsonDecoder {
    reader: IReader & IReaderResettable;
    constructor(reader?: IReader & IReaderResettable);
    read(uint8: Uint8Array): unknown;
    decode(uint8: Uint8Array): unknown;
    readAny(): unknown;
    readDocument(): Record<string, unknown>;
    readCString(): string;
    readString(): string;
    readElementValue(type: number): unknown;
    readArray(): unknown[];
    readBinary(): BsonBinary | Uint8Array;
    readObjectId(): BsonObjectId;
    readRegex(): RegExp;
    readDbPointer(): BsonDbPointer;
    readCodeWithScope(): BsonJavascriptCodeWithScope;
    readTimestamp(): BsonTimestamp;
    readDecimal128(): BsonDecimal128;
}
