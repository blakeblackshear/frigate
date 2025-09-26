import { binary_string } from './types';
export declare const unwrapBinary: (value: unknown) => unknown;
export declare const parse: (json: string) => unknown;
export declare const stringifyBinary: <T extends Uint8Array>(value: T) => binary_string<T>;
export declare const wrapBinary: (value: unknown) => unknown;
type Stringify = ((value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number) => string) | ((value: any, replacer?: (number | string)[] | null, space?: string | number) => string);
export declare const stringify: Stringify;
export {};
