import type { Path } from '@jsonjoy.com/json-pointer';
import type { MsgPackDecoder } from './MsgPackDecoder';
type Decoder = Pick<MsgPackDecoder, 'readObjHdr' | 'readStrHdr' | 'readArrHdr' | 'skipAny'>;
type Fn = (decoder: Decoder) => number;
export declare const genShallowReader: (path: Path) => Fn;
export {};
