import { Shape, ShapeConfig } from '../Shape.js';
import { GetSet } from '../types.js';
import { Context } from '../Context.js';
export interface ArcConfig extends ShapeConfig {
    angle: number;
    innerRadius: number;
    outerRadius: number;
    clockwise?: boolean;
}
export declare class Arc extends Shape<ArcConfig> {
    _sceneFunc(context: Context): void;
    getWidth(): number;
    getHeight(): number;
    setWidth(width: number): void;
    setHeight(height: number): void;
    getSelfRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    innerRadius: GetSet<number, this>;
    outerRadius: GetSet<number, this>;
    angle: GetSet<number, this>;
    clockwise: GetSet<boolean, this>;
}
