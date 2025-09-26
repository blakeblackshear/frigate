import type { EdgeData, Point } from '../types.js';
export declare const markerOffsets: {
    readonly aggregation: 17.25;
    readonly extension: 17.25;
    readonly composition: 17.25;
    readonly dependency: 6;
    readonly lollipop: 13.5;
    readonly arrow_point: 4;
};
export declare const markerOffsets2: {
    readonly arrow_point: 9;
    readonly arrow_cross: 12.5;
    readonly arrow_circle: 12.5;
};
export declare const getLineFunctionsWithOffset: (edge: Pick<EdgeData, "arrowTypeStart" | "arrowTypeEnd">) => {
    x: (this: void, d: Point | [number, number], i: number, data: (Point | [number, number])[]) => number;
    y: (this: void, d: Point | [number, number], i: number, data: (Point | [number, number])[]) => number;
};
