import { KonvaEventObject } from './Node.js';
import { Shape } from './Shape.js';
import { Stage } from './Stage.js';
export interface KonvaPointerEvent extends KonvaEventObject<PointerEvent> {
    pointerId: number;
}
export declare function getCapturedShape(pointerId: number): Shape<import("./Shape.js").ShapeConfig> | Stage | undefined;
export declare function createEvent(evt: PointerEvent): KonvaPointerEvent;
export declare function hasPointerCapture(pointerId: number, shape: Shape | Stage): boolean;
export declare function setPointerCapture(pointerId: number, shape: Shape | Stage): void;
export declare function releaseCapture(pointerId: number, target?: Shape | Stage): void;
