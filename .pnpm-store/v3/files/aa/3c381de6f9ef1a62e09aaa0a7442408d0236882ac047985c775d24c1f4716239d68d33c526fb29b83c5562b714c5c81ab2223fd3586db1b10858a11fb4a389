import { JsonEncoder } from '../json/JsonEncoder';
import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
export interface EjsonEncoderOptions {
    canonical?: boolean;
}
export declare class EjsonEncoder extends JsonEncoder {
    private options;
    constructor(writer: IWriter & IWriterGrowable, options?: EjsonEncoderOptions);
    encodeToString(value: unknown): string;
    writeUnknown(value: unknown): void;
    writeAny(value: unknown): void;
    writeBin(buf: Uint8Array): void;
    writeStr(str: string): void;
    writeAsciiStr(str: string): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
    private writeUndefinedWrapper;
    private writeNumberAsEjson;
    private writeNumberIntWrapper;
    private writeNumberLongWrapper;
    private writeNumberDoubleWrapper;
    private writeDateAsEjson;
    private writeRegExpAsEjson;
    private writeObjectIdAsEjson;
    private writeBsonInt32AsEjson;
    private writeBsonInt64AsEjson;
    private writeBsonFloatAsEjson;
    private writeBsonDecimal128AsEjson;
    private writeBsonBinaryAsEjson;
    private writeBsonCodeAsEjson;
    private writeBsonCodeWScopeAsEjson;
    private writeBsonSymbolAsEjson;
    private writeBsonTimestampAsEjson;
    private writeBsonDbPointerAsEjson;
    private writeBsonMinKeyAsEjson;
    private writeBsonMaxKeyAsEjson;
    private formatNonFinite;
    private objectIdToHex;
    private uint8ArrayToBase64;
    private decimal128ToString;
}
