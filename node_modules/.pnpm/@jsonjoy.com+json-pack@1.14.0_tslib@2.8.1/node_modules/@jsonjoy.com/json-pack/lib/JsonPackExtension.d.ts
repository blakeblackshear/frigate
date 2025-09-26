export declare class JsonPackExtension<T = Uint8Array> {
    readonly tag: number;
    readonly val: T;
    constructor(tag: number, val: T);
}
