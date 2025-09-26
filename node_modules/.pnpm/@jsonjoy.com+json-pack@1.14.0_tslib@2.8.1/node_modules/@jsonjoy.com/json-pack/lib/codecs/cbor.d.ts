import { CborDecoder } from '../cbor/CborDecoder';
import { CborEncoder } from '../cbor/CborEncoder';
import { EncodingFormat } from '../constants';
import type { Writer } from '@jsonjoy.com/buffers/lib/Writer';
import type { JsonValueCodec } from './types';
export declare class CborJsonValueCodec implements JsonValueCodec {
    readonly id = "cbor";
    readonly format = EncodingFormat.Cbor;
    readonly encoder: CborEncoder;
    readonly decoder: CborDecoder;
    constructor(writer: Writer);
}
