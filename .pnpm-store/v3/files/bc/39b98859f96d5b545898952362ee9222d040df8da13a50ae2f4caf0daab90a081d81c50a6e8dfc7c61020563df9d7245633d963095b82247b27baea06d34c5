import { Shape, ShapeConfig } from '../Shape.js';
import { GetSet } from '../types.js';
import { Context } from '../Context.js';
export interface RingConfig extends ShapeConfig {
    innerRadius: number;
    outerRadius: number;
}
export declare class Ring extends Shape<RingConfig> {
    _sceneFunc(context: Context): void;
    getWidth(): number;
    getHeight(): number;
    setWidth(width: number): void;
    setHeight(height: number): void;
    outerRadius: GetSet<number, this>;
    innerRadius: GetSet<number, this>;
}
