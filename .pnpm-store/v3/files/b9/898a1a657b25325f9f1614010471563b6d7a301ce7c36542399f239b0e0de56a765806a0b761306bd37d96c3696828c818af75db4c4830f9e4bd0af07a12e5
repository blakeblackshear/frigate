import type { CachedUtf8Decoder } from '@jsonjoy.com/buffers/lib/utf8/CachedUtf8Decoder';
import type { IReader, IReaderResettable } from '@jsonjoy.com/buffers/lib';
import { Import } from './Import';
export declare class IonDecoderBase<R extends IReader & IReaderResettable = IReader & IReaderResettable> {
    readonly reader: R;
    readonly utf8Decoder: CachedUtf8Decoder;
    protected symbols?: Import;
    constructor(reader?: R);
    val(): unknown;
    protected readNull(length: number): null;
    protected readBool(length: number): boolean | null;
    protected readUint(length: number): number | null;
    protected readNint(length: number): number | null;
    protected readFloat(length: number): number | null;
    protected readString(length: number): string | null;
    protected readBinary(length: number): Uint8Array | null;
    protected readList(length: number): unknown[] | null;
    protected readStruct(length: number): Record<string, unknown> | null;
    protected readAnnotation(length: number): unknown;
    protected readVUint(): number;
    protected readVInt(): number;
    protected getSymbolText(symbolId: number): string;
    protected validateBVM(): void;
    protected readSymbolTable(): void;
}
