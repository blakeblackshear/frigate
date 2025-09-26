import type { IReader, IReaderResettable } from '@jsonjoy.com/buffers/lib';
import type { XdrSchema } from './types';
export declare class XdrSchemaDecoder {
    readonly reader: IReader & IReaderResettable;
    private decoder;
    constructor(reader?: IReader & IReaderResettable);
    decode(data: Uint8Array, schema: XdrSchema): unknown;
    private readValue;
    private readEnum;
    private readOpaque;
    private readVarlenOpaque;
    private readString;
    private readArray;
    private readVarlenArray;
    private readStruct;
    private readUnion;
}
