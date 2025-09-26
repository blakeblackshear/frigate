import { json_string } from '@jsonjoy.com/util/lib/json-brand';
export declare class MsgPackToJsonConverter {
    protected uint8: Uint8Array;
    protected view: DataView;
    protected x: number;
    constructor();
    reset(uint8: Uint8Array): void;
    convert<T = unknown>(uint8: Uint8Array): json_string<T>;
    protected val(): string;
    protected str(size: number): string;
    protected obj(size: number): json_string<object>;
    protected key(): json_string<string>;
    protected arr(size: number): json_string<unknown[]>;
    protected bin(size: number): string;
    protected ext(size: number): string;
    protected u8(): number;
    protected u16(): number;
    protected u32(): number;
    protected i8(): number;
    protected i16(): number;
    protected i32(): number;
    protected f32(): number;
    protected f64(): number;
}
