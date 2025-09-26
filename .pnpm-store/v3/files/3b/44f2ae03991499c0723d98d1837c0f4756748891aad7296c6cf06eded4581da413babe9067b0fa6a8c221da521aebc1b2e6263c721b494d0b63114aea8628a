import { type JsonPath } from "json-crawl";
import type { AnyOfNode, OneOfNode, RefNode } from "./types";
export declare class MapArray<K, V> extends Map<K, Array<V>> {
    add(key: K, value: V): this;
}
export declare const popValues: (data: Record<string, unknown>, keys: string[]) => Record<string, unknown>;
export declare const mergeValues: (value: any, patch: any) => any;
export declare const isRefNode: (value: any) => value is RefNode;
export declare const isAnyOfNode: (value: any) => value is AnyOfNode;
export declare const isOneOfNode: (value: any) => value is OneOfNode;
export declare const parseRef: ($ref: string, basePath?: string) => {
    filePath: string;
    pointer: string;
    normalized: string;
    jsonPath: string[];
};
export declare const createRef: (basePath?: string, pointer?: string) => string;
export declare const resolvePointer: (data: unknown, pointer: string, pointers?: string[]) => any;
export declare const pathMask: {
    slash: RegExp;
    tilde: RegExp;
    escapedSlash: RegExp;
    escapedTilde: RegExp;
};
export declare const parsePointer: (pointer: string) => string[];
export declare const buildPointer: (path: JsonPath) => string;
export declare const isEqual: (a: any, b: any) => boolean;
export declare const findMultiplierForInteger: (number: number) => number;
export declare function calculateLCM(args: number[]): number;
export declare function calculateGCD(a: number, b: number): number;
export declare const findCombinations: (vectors: any[][]) => any[][];
