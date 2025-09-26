import { Reader } from '@jsonjoy.com/buffers/lib/Reader';
import type { AvroSchema } from './types';
export declare class AvroSchemaDecoder {
    readonly reader: Reader;
    private decoder;
    private validator;
    private namedSchemas;
    constructor(reader?: Reader);
    decode(data: Uint8Array, schema: AvroSchema): unknown;
    private readValue;
    private readRecord;
    private readEnum;
    private readArray;
    private readMap;
    private readUnion;
    private readFixed;
    readNull(schema: AvroSchema): null;
    readBoolean(schema: AvroSchema): boolean;
    readInt(schema: AvroSchema): number;
    readLong(schema: AvroSchema): number | bigint;
    readFloat(schema: AvroSchema): number;
    readDouble(schema: AvroSchema): number;
    readBytes(schema: AvroSchema): Uint8Array;
    readString(schema: AvroSchema): string;
    private validateSchemaType;
    private resolveSchema;
    private collectNamedSchemas;
    private getFullName;
}
