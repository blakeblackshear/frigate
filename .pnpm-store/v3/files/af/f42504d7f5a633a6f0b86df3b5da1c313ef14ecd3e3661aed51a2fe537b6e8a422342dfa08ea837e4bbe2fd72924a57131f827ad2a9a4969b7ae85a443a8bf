import { JsonDecoder } from './JsonDecoder';
import type { PackValue } from '../types';
export declare class DecodeFinishError extends Error {
    readonly value: unknown;
    constructor(value: unknown);
}
export declare class JsonDecoderPartial extends JsonDecoder {
    readAny(): unknown;
    readArr(): unknown[];
    readObj(): PackValue | Record<string, unknown> | unknown;
}
