import { Reader } from '@jsonjoy.com/buffers/lib/Reader';
import type { BinaryJsonDecoder, PackValue } from '../types';
export declare class UbjsonDecoder implements BinaryJsonDecoder {
    reader: Reader;
    read(uint8: Uint8Array): PackValue;
    decode(uint8: Uint8Array): unknown;
    readAny(): PackValue;
}
