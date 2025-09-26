import { Reader } from '@jsonjoy.com/buffers/lib/Reader';
import type { BinaryJsonDecoder, PackValue } from '../types';
export declare class BencodeDecoder implements BinaryJsonDecoder {
    reader: Reader;
    read(uint8: Uint8Array): unknown;
    decode(uint8: Uint8Array): unknown;
    readAny(): unknown;
    readNull(): null;
    readUndef(): undefined;
    readTrue(): true;
    readFalse(): false;
    readBool(): unknown;
    readNum(): number;
    readStr(): string;
    readBin(): Uint8Array;
    readArr(): unknown[];
    readObj(): PackValue | Record<string, unknown> | unknown;
}
