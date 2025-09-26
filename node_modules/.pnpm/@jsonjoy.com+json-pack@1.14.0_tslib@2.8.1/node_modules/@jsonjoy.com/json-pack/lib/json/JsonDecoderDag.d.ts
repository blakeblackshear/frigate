import { JsonDecoder } from './JsonDecoder';
import type { PackValue } from '../types';
export declare const fromBase64Bin: (view: DataView, offset: number, length: number) => Uint8Array;
export declare class JsonDecoderDag extends JsonDecoder {
    readObj(): PackValue | Record<string, PackValue> | Uint8Array | unknown;
    protected tryReadBytes(): Uint8Array | undefined;
    protected tryReadCid(): undefined | unknown;
    readCid(cid: string): unknown;
}
