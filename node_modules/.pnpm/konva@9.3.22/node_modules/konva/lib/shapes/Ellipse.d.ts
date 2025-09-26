import { Shape, ShapeConfig } from '../Shape.js';
import { Context } from '../Context.js';
import { GetSet, Vector2d } from '../types.js';
export interface EllipseConfig extends ShapeConfig {
    radiusX: number;
    radiusY: number;
}
export declare class Ellipse extends Shape<EllipseConfig> {
    _sceneFunc(context: Context): void;
    getWidth(): number;
    getHeight(): number;
    setWidth(width: number): void;
    setHeight(height: number): void;
    radius: GetSet<Vector2d, this>;
    radiusX: GetSet<number, this>;
    radiusY: GetSet<number, this>;
}
