import { Config, Options, ResolvedOptions, Drawable } from './core';
import { RoughGenerator } from './generator';
import { Point } from './geometry';
export declare class RoughCanvas {
    private gen;
    private canvas;
    private ctx;
    constructor(canvas: HTMLCanvasElement, config?: Config);
    draw(drawable: Drawable): void;
    private fillSketch;
    private _drawToContext;
    get generator(): RoughGenerator;
    getDefaultOptions(): ResolvedOptions;
    line(x1: number, y1: number, x2: number, y2: number, options?: Options): Drawable;
    rectangle(x: number, y: number, width: number, height: number, options?: Options): Drawable;
    ellipse(x: number, y: number, width: number, height: number, options?: Options): Drawable;
    circle(x: number, y: number, diameter: number, options?: Options): Drawable;
    linearPath(points: Point[], options?: Options): Drawable;
    polygon(points: Point[], options?: Options): Drawable;
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: Options): Drawable;
    curve(points: Point[] | Point[][], options?: Options): Drawable;
    path(d: string, options?: Options): Drawable;
}
