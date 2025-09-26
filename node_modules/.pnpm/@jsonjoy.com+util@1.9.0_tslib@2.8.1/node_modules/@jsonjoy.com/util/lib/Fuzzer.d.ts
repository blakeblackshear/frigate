/// <reference types="node" />
export declare class Fuzzer {
    static randomInt(min: number, max: number): number;
    static randomInt2([min, max]: [min: number, max: number]): number;
    static pick<T>(elements: T[]): T;
    static repeat<T>(times: number, callback: () => T): T[];
    readonly seed: Buffer;
    readonly random: () => number;
    constructor(seed?: Buffer);
    readonly randomInt: (min: number, max: number) => number;
    readonly pick: <T>(elements: T[]) => T;
    readonly repeat: <T>(times: number, callback: () => T) => T[];
}
