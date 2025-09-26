import { Context } from './Context.js';
interface ICanvasConfig {
    width?: number;
    height?: number;
    pixelRatio?: number;
    willReadFrequently?: boolean;
}
export declare class Canvas {
    pixelRatio: number;
    _canvas: HTMLCanvasElement;
    context: Context;
    width: number;
    height: number;
    isCache: boolean;
    constructor(config: ICanvasConfig);
    getContext(): Context;
    getPixelRatio(): number;
    setPixelRatio(pixelRatio: any): void;
    setWidth(width: any): void;
    setHeight(height: any): void;
    getWidth(): number;
    getHeight(): number;
    setSize(width: any, height: any): void;
    toDataURL(mimeType: any, quality: any): string;
}
export declare class SceneCanvas extends Canvas {
    constructor(config?: ICanvasConfig);
}
export declare class HitCanvas extends Canvas {
    hitCanvas: boolean;
    constructor(config?: ICanvasConfig);
}
export {};
