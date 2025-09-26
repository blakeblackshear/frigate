import { Config, Options, OpSet, ResolvedOptions, Drawable } from './core';
import { RoughGenerator } from './generator';
import { Point } from './geometry';
export declare class RoughSVG {
    private gen;
    private svg;
    constructor(svg: SVGSVGElement, config?: Config);
    draw(drawable: Drawable): SVGGElement;
    private fillSketch;
    get generator(): RoughGenerator;
    getDefaultOptions(): ResolvedOptions;
    opsToPath(drawing: OpSet, fixedDecimalPlaceDigits?: number): string;
    line(x1: number, y1: number, x2: number, y2: number, options?: Options): SVGGElement;
    rectangle(x: number, y: number, width: number, height: number, options?: Options): SVGGElement;
    ellipse(x: number, y: number, width: number, height: number, options?: Options): SVGGElement;
    circle(x: number, y: number, diameter: number, options?: Options): SVGGElement;
    linearPath(points: Point[], options?: Options): SVGGElement;
    polygon(points: Point[], options?: Options): SVGGElement;
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: Options): SVGGElement;
    curve(points: Point[] | Point[][], options?: Options): SVGGElement;
    path(d: string, options?: Options): SVGGElement;
}
