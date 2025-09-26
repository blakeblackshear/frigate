import type { ItemsRange } from "../core";
export declare const styleToString: (obj: Record<string, string | undefined>) => string;
export declare const defaultGetKey: (_data: unknown, i: number) => string;
export declare function iterRange([start, end]: ItemsRange): Generator<number, void, unknown>;
