import { CborEncoderFast } from './CborEncoderFast';
import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
export declare class CborEncoder<W extends IWriter & IWriterGrowable = IWriter & IWriterGrowable> extends CborEncoderFast<W> {
    writeUnknown(value: unknown): void;
    writeAny(value: unknown): void;
    writeFloat(float: number): void;
    writeMap(map: Map<unknown, unknown>): void;
    writeUndef(): void;
}
