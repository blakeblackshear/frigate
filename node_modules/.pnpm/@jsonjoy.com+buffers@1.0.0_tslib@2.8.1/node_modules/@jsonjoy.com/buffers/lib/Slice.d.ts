export declare class Slice {
    readonly uint8: Uint8Array;
    readonly view: DataView;
    readonly start: number;
    readonly end: number;
    constructor(uint8: Uint8Array, view: DataView, start: number, end: number);
    subarray(): Uint8Array;
}
