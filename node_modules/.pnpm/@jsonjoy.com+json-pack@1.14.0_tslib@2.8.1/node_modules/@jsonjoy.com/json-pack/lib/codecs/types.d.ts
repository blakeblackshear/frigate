import type { EncodingFormat } from '../constants';
import type { BinaryJsonDecoder, BinaryJsonEncoder } from '../types';
export interface JsonValueCodec {
    id: string;
    format: EncodingFormat;
    encoder: BinaryJsonEncoder;
    decoder: BinaryJsonDecoder;
}
