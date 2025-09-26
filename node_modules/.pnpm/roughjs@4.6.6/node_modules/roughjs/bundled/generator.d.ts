import { Config, Options, Drawable, OpSet, ResolvedOptions, PathInfo } from './core.js';
import { Point } from './geometry.js';
export declare class RoughGenerator {
    private config;
    defaultOptions: ResolvedOptions;
    constructor(config?: Config);
    static newSeed(): number;
    private _o;
    private _d;
    line(x1: number, y1: number, x2: number, y2: number, options?: Options): Drawable;
    rectangle(x: number, y: number, width: number, height: number, options?: Options): Drawable;
    ellipse(x: number, y: number, width: number, height: number, options?: Options): Drawable;
    circle(x: number, y: number, diameter: number, options?: Options): Drawable;
    linearPath(points: Point[], options?: Options): Drawable;
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: Options): Drawable;
    curve(points: Point[] | Point[][], options?: Options): Drawable;
    polygon(points: Point[], options?: Options): Drawable;
    path(d: string, options?: Options): Drawable;
    opsToPath(drawing: OpSet, fixedDecimals?: number): string;
    toPaths(drawable: Drawable): PathInfo[];
    private fillSketch;
    private _mergedShape;
}
