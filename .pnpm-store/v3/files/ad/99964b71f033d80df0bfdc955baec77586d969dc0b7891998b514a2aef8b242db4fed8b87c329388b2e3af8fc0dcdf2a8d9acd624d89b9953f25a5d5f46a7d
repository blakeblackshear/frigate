import { Context } from './Context.js';
import { IRect, RGB, Vector2d } from './types.js';
export declare class Transform {
    m: Array<number>;
    dirty: boolean;
    constructor(m?: number[]);
    reset(): void;
    copy(): Transform;
    copyInto(tr: Transform): void;
    point(point: Vector2d): {
        x: number;
        y: number;
    };
    translate(x: number, y: number): this;
    scale(sx: number, sy: number): this;
    rotate(rad: number): this;
    getTranslation(): {
        x: number;
        y: number;
    };
    skew(sx: number, sy: number): this;
    multiply(matrix: Transform): this;
    invert(): this;
    getMatrix(): number[];
    decompose(): {
        x: number;
        y: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        skewX: number;
        skewY: number;
    };
}
export declare const Util: {
    _isElement(obj: any): obj is Element;
    _isFunction(obj: any): boolean;
    _isPlainObject(obj: any): boolean;
    _isArray(obj: any): obj is Array<any>;
    _isNumber(obj: any): obj is number;
    _isString(obj: any): obj is string;
    _isBoolean(obj: any): obj is boolean;
    isObject(val: any): val is object;
    isValidSelector(selector: any): boolean;
    _sign(number: number): 1 | -1;
    requestAnimFrame(callback: Function): void;
    createCanvasElement(): HTMLCanvasElement;
    createImageElement(): HTMLImageElement;
    _isInDocument(el: any): boolean;
    _urlToImage(url: string, callback: Function): void;
    _rgbToHex(r: number, g: number, b: number): string;
    _hexToRgb(hex: string): RGB;
    getRandomColor(): string;
    getRGB(color: string): RGB;
    colorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _namedColorToRBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | null;
    _rgbColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _rgbaColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _hex8ColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _hex6ColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _hex4ColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _hex3ColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    _hslColorToRGBA(str: string): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | undefined;
    haveIntersection(r1: IRect, r2: IRect): boolean;
    cloneObject<Any>(obj: Any): Any;
    cloneArray(arr: Array<any>): any[];
    degToRad(deg: number): number;
    radToDeg(rad: number): number;
    _degToRad(deg: number): number;
    _radToDeg(rad: number): number;
    _getRotation(radians: number): number;
    _capitalize(str: string): string;
    throw(str: string): never;
    error(str: string): void;
    warn(str: string): void;
    each(obj: object, func: Function): void;
    _inRange(val: number, left: number, right: number): boolean;
    _getProjectionToSegment(x1: any, y1: any, x2: any, y2: any, x3: any, y3: any): any[];
    _getProjectionToLine(pt: Vector2d, line: Array<Vector2d>, isClosed: boolean): Vector2d;
    _prepareArrayForTween(startArray: any, endArray: any, isClosed: any): number[];
    _prepareToStringify<T>(obj: any): T | null;
    _assign<T, U>(target: T, source: U): T & U;
    _getFirstPointerId(evt: any): any;
    releaseCanvas(...canvases: HTMLCanvasElement[]): void;
    drawRoundedRectPath(context: Context, width: number, height: number, cornerRadius: number | number[]): void;
};
