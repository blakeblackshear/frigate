import type { MsgPack } from '../msgpack';
import type { CborUint8Array } from '../cbor/types';
import type { Brand } from '@jsonjoy.com/util/lib/types';
export type base64_string<T extends Uint8Array = Uint8Array> = Brand<string, T, 'base64_string'>;
export type binary_string<T extends Uint8Array = Uint8Array> = Brand<`data:application/octet-stream;base64,${base64_string<T>}`, T, 'binary_string'>;
export type cbor_string<T = unknown> = Brand<`data:application/cbor;base64,${base64_string<CborUint8Array<T>>}`, T, 'cbor_string'>;
export type msgpack_string<T = unknown> = Brand<`data:application/msgpack;base64,${base64_string<MsgPack<T>>}`, T, 'msgpack_string'>;
