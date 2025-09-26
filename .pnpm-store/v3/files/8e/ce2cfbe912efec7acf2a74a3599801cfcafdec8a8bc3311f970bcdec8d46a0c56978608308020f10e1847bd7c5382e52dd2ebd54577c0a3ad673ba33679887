import { IonDecoderBase } from './IonDecoderBase';
import type { IReader, IReaderResettable } from '@jsonjoy.com/buffers/lib';
export declare class IonDecoder<R extends IReader & IReaderResettable = IReader & IReaderResettable> extends IonDecoderBase<R> {
    constructor(reader?: R);
    decode(data: Uint8Array): unknown;
    read(): unknown;
}
