import { Shape, ShapeConfig } from '../Shape.js';
import { Context } from '../Context.js';
import { GetSet } from '../types.js';
export interface LineConfig extends ShapeConfig {
    points?: number[] | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
    tension?: number;
    closed?: boolean;
    bezier?: boolean;
}
export declare class Line<Config extends LineConfig = LineConfig> extends Shape<Config> {
    constructor(config?: Config);
    _sceneFunc(context: Context): void;
    getTensionPoints(): any;
    _getTensionPoints(): number[];
    _getTensionPointsClosed(): number[];
    getWidth(): number;
    getHeight(): number;
    getSelfRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    closed: GetSet<boolean, this>;
    bezier: GetSet<boolean, this>;
    tension: GetSet<number, this>;
    points: GetSet<number[], this>;
}
