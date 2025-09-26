import { Context } from '../Context.js';
import { Shape, ShapeConfig } from '../Shape.js';
import { Animation } from '../Animation.js';
import { GetSet } from '../types.js';
export interface SpriteConfig extends ShapeConfig {
    animation: string;
    animations: any;
    frameIndex?: number;
    image: HTMLImageElement;
    frameRate?: number;
}
export declare class Sprite extends Shape<SpriteConfig> {
    _updated: boolean;
    anim: Animation;
    interval: any;
    constructor(config: SpriteConfig);
    _sceneFunc(context: Context): void;
    _hitFunc(context: Context): void;
    _useBufferCanvas(): boolean;
    _setInterval(): void;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    _updateIndex(): void;
    frameIndex: GetSet<number, this>;
    animation: GetSet<string, this>;
    image: GetSet<CanvasImageSource, this>;
    animations: GetSet<any, this>;
    frameOffsets: GetSet<any, this>;
    frameRate: GetSet<number, this>;
}
