import type { IReader, IReaderResettable } from '@jsonjoy.com/buffers/lib';
import type { BinaryJsonDecoder } from '../types';
export declare class XdrDecoder<R extends IReader & IReaderResettable = IReader & IReaderResettable> implements BinaryJsonDecoder {
    reader: R;
    constructor(reader?: R);
    read(uint8: Uint8Array): unknown;
    decode(uint8: Uint8Array): unknown;
    readAny(): unknown;
    readVoid(): void;
    readBoolean(): boolean;
    readInt(): number;
    readUnsignedInt(): number;
    readHyper(): bigint;
    readUnsignedHyper(): bigint;
    readFloat(): number;
    readDouble(): number;
    readQuadruple(): number;
    readOpaque(size: number): Uint8Array;
    readVarlenOpaque(): Uint8Array;
    readString(): string;
    readEnum(): number;
    readArray<T>(size: number, elementReader: () => T): T[];
    readVarlenArray<T>(elementReader: () => T): T[];
}
