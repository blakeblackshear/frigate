import { Layer } from './Layer.js';
import { IFrame, AnimationFn } from './types.js';
export declare class Animation {
    func: AnimationFn;
    id: number;
    layers: Layer[];
    frame: IFrame;
    constructor(func: AnimationFn, layers?: any);
    setLayers(layers: null | Layer | Layer[]): this;
    getLayers(): Layer[];
    addLayer(layer: Layer): boolean;
    isRunning(): boolean;
    start(): this;
    stop(): this;
    _updateFrameObject(time: number): void;
    static animations: Array<Animation>;
    static animIdCounter: number;
    static animRunning: boolean;
    static _addAnimation(anim: any): void;
    static _removeAnimation(anim: any): void;
    static _runFrames(): void;
    static _animationLoop(): void;
    static _handleAnimation(): void;
}
