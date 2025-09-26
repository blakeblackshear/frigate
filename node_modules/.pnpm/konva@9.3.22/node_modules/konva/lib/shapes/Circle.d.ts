import { Shape, ShapeConfig } from '../Shape.js';
import { GetSet } from '../types.js';
import { Context } from '../Context.js';
export interface CircleConfig extends ShapeConfig {
    radius?: number;
}
export declare class Circle extends Shape<CircleConfig> {
    _sceneFunc(context: Context): void;
    getWidth(): number;
    getHeight(): number;
    setWidth(width: number): void;
    setHeight(height: number): void;
    radius: GetSet<number, this>;
}
