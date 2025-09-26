import { RespEncoder } from './RespEncoder';
import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
export declare class RespEncoderLegacy<W extends IWriter & IWriterGrowable = IWriter & IWriterGrowable> extends RespEncoder<W> {
    writeAny(value: unknown): void;
    writeNumber(num: number): void;
    writeStr(str: string): void;
    writeNull(): void;
    writeErr(str: string): void;
    writeSet(set: Set<unknown>): void;
    writeArr(arr: unknown[]): void;
    writeObj(obj: Record<string, unknown>): void;
}
