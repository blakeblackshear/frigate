import { Canvas } from './Canvas.js';
import { Shape } from './Shape.js';
import { IRect } from './types.js';
import type { Node } from './Node.js';
declare const CONTEXT_PROPERTIES: readonly ["fillStyle", "strokeStyle", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "letterSpacing", "lineCap", "lineDashOffset", "lineJoin", "lineWidth", "miterLimit", "direction", "font", "textAlign", "textBaseline", "globalAlpha", "globalCompositeOperation", "imageSmoothingEnabled"];
interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
    letterSpacing: string;
}
export declare class Context {
    canvas: Canvas;
    _context: CanvasRenderingContext2D;
    traceArr: Array<string>;
    constructor(canvas: Canvas);
    fillShape(shape: Shape): void;
    _fill(shape: Shape): void;
    strokeShape(shape: Shape): void;
    _stroke(shape: Shape): void;
    fillStrokeShape(shape: Shape): void;
    getTrace(relaxed?: boolean, rounded?: boolean): string;
    clearTrace(): void;
    _trace(str: any): void;
    reset(): void;
    getCanvas(): Canvas;
    clear(bounds?: IRect): void;
    _applyLineCap(shape: Shape): void;
    _applyOpacity(shape: Node): void;
    _applyLineJoin(shape: Shape): void;
    setAttr(attr: string, val: any): void;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterClockwise?: boolean): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    beginPath(): void;
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
    clearRect(x: number, y: number, width: number, height: number): void;
    clip(fillRule?: CanvasFillRule): void;
    clip(path: Path2D, fillRule?: CanvasFillRule): void;
    closePath(): void;
    createImageData(width: any, height: any): ImageData | undefined;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
    createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
    drawImage(image: CanvasImageSource, sx: number, sy: number, sWidth?: number, sHeight?: number, dx?: number, dy?: number, dWidth?: number, dHeight?: number): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
    isPointInPath(x: number, y: number, path?: Path2D, fillRule?: CanvasFillRule): boolean;
    fill(fillRule?: CanvasFillRule): void;
    fill(path: Path2D, fillRule?: CanvasFillRule): void;
    fillRect(x: number, y: number, width: number, height: number): void;
    strokeRect(x: number, y: number, width: number, height: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    measureText(text: string): TextMetrics;
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
    lineTo(x: number, y: number): void;
    moveTo(x: number, y: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    roundRect(x: number, y: number, width: number, height: number, radii: number | DOMPointInit | (number | DOMPointInit)[]): void;
    putImageData(imageData: ImageData, dx: number, dy: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    restore(): void;
    rotate(angle: number): void;
    save(): void;
    scale(x: number, y: number): void;
    setLineDash(segments: number[]): void;
    getLineDash(): number[];
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    stroke(path2d?: Path2D): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    translate(x: number, y: number): void;
    _enableTrace(): void;
    _applyGlobalCompositeOperation(node: any): void;
}
type CanvasContextProps = Pick<ExtendedCanvasRenderingContext2D, (typeof CONTEXT_PROPERTIES)[number]>;
export interface Context extends CanvasContextProps {
}
export declare class SceneContext extends Context {
    constructor(canvas: Canvas, { willReadFrequently }?: {
        willReadFrequently?: boolean | undefined;
    });
    _fillColor(shape: Shape): void;
    _fillPattern(shape: Shape): void;
    _fillLinearGradient(shape: Shape): void;
    _fillRadialGradient(shape: Shape): void;
    _fill(shape: any): void;
    _strokeLinearGradient(shape: any): void;
    _stroke(shape: any): void;
    _applyShadow(shape: any): void;
}
export declare class HitContext extends Context {
    constructor(canvas: Canvas);
    _fill(shape: Shape): void;
    strokeShape(shape: Shape): void;
    _stroke(shape: any): void;
}
export {};
