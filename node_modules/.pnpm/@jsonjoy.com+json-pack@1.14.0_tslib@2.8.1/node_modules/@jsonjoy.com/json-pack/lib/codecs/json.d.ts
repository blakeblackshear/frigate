import { EncodingFormat } from '../constants';
import { JsonEncoder } from '../json/JsonEncoder';
import { JsonDecoder } from '../json/JsonDecoder';
import type { Writer } from '@jsonjoy.com/buffers/lib/Writer';
import type { JsonValueCodec } from './types';
export declare class JsonJsonValueCodec implements JsonValueCodec {
    readonly id = "json";
    readonly format = EncodingFormat.Json;
    readonly encoder: JsonEncoder;
    readonly decoder: JsonDecoder;
    constructor(writer: Writer);
}
