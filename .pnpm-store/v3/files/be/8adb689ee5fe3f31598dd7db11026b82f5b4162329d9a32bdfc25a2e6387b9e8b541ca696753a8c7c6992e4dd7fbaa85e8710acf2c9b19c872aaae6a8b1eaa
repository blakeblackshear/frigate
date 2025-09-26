import { EncodingFormat } from '../constants';
import { MsgPackEncoder } from '../msgpack';
import { MsgPackDecoder } from '../msgpack/MsgPackDecoder';
import type { Writer } from '@jsonjoy.com/buffers/lib/Writer';
import type { JsonValueCodec } from './types';
export declare class MsgPackJsonValueCodec implements JsonValueCodec {
    readonly id = "msgpack";
    readonly format = EncodingFormat.MsgPack;
    readonly encoder: MsgPackEncoder;
    readonly decoder: MsgPackDecoder;
    constructor(writer: Writer);
}
