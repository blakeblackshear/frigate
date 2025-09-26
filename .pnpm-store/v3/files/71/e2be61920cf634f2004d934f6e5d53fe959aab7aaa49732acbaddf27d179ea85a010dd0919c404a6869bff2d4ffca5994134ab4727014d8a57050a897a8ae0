import { Node } from './Node.js';
import { Vector2d } from './types.js';
export declare const DD: {
    readonly isDragging: boolean;
    justDragged: boolean;
    readonly node: Node<import("./Node.js").NodeConfig> | undefined;
    _dragElements: Map<number, {
        node: Node;
        startPointerPos: Vector2d;
        offset: Vector2d;
        pointerId?: number;
        dragStatus: "ready" | "dragging" | "stopped";
    }>;
    _drag(evt: any): void;
    _endDragBefore(evt?: any): void;
    _endDragAfter(evt: any): void;
};
