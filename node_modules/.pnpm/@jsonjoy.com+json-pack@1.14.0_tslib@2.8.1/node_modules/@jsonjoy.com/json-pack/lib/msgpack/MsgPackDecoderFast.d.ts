import { JsonPackExtension } from '../JsonPackExtension';
import { Reader } from '@jsonjoy.com/buffers/lib/Reader';
import type { BinaryJsonDecoder, PackValue } from '../types';
import type { CachedUtf8Decoder } from '@jsonjoy.com/buffers/lib/utf8/CachedUtf8Decoder';
export declare class MsgPackDecoderFast<R extends Reader> implements BinaryJsonDecoder {
    reader: R;
    protected readonly keyDecoder: CachedUtf8Decoder;
    constructor(reader?: R, keyDecoder?: CachedUtf8Decoder);
    decode(uint8: Uint8Array): unknown;
    read(uint8: Uint8Array): PackValue;
    val(): unknown;
    readAny(): unknown;
    str(): unknown;
    protected obj(size: number): object;
    protected key(): string;
    protected arr(size: number): unknown[];
    protected ext(size: number): JsonPackExtension;
    protected back(bytes: number): void;
}
