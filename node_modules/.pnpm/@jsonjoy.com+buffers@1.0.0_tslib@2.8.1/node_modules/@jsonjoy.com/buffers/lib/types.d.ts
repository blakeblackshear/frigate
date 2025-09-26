import type { Slice } from './Slice';
export interface IWriter {
    uint8: Uint8Array;
    view: DataView;
    x0: number;
    x: number;
    u8(char: number): void;
    u16(word: number): void;
    u32(dword: number): void;
    i32(dword: number): void;
    u64(qword: number | bigint): void;
    u8u16(u8: number, u16: number): void;
    u8u32(u8: number, u32: number): void;
    u8u64(u8: number, u64: number | bigint): void;
    u8f32(u8: number, f64: number): void;
    u8f64(u8: number, f64: number): void;
    f64(dword: number): void;
    buf(buf: Uint8Array, length: number): void;
    utf8(str: string): number;
    ascii(str: string): void;
}
export interface IWriterGrowable {
    reset(): void;
    ensureCapacity(capacity: number): void;
    move(length: number): void;
    flush(): Uint8Array;
    flushSlice(): Slice;
    newBuffer(size: number): void;
}
export interface IReaderBase {
    peek(): number;
    peak(): number;
    skip(length: number): void;
    buf(size: number): Uint8Array;
    u8(): number;
    i8(): number;
    u16(): number;
    i16(): number;
    u32(): number;
    u64(): bigint;
    i64(): bigint;
    i32(): number;
    f32(): number;
    f64(): number;
    utf8(size: number): string;
    ascii(length: number): string;
}
export interface IReader extends IReaderBase {
    uint8: Uint8Array;
    view: DataView;
    x: number;
}
export interface IReaderResettable {
    reset(uint8: Uint8Array): void;
}
