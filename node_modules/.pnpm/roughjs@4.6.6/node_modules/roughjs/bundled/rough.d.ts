import { Config } from './core';
import { RoughCanvas } from './canvas';
import { RoughGenerator } from './generator';
import { RoughSVG } from './svg';
declare const _default: {
    canvas(canvas: HTMLCanvasElement, config?: Config): RoughCanvas;
    svg(svg: SVGSVGElement, config?: Config): RoughSVG;
    generator(config?: Config): RoughGenerator;
    newSeed(): number;
};
export default _default;
