import { MsgPackDecoderFast } from './MsgPackDecoderFast';
import type { Path } from '@jsonjoy.com/json-pointer';
import type { Reader } from '@jsonjoy.com/buffers/lib/Reader';
export declare class MsgPackDecoder extends MsgPackDecoderFast<Reader> {
    skipAny(): number;
    protected skipArr(size: number): number;
    protected skipObj(size: number): number;
    readLevel(uint8: Uint8Array): unknown;
    protected valOneLevel(): unknown;
    protected primitive(): unknown;
    protected skip(length: number): number;
    validate(value: Uint8Array, offset?: number, size?: number): void;
    readObjHdr(): number;
    readStrHdr(): number;
    findKey(key: string): this;
    readArrHdr(): number;
    findIndex(index: number): this;
    find(path: Path): this;
}
