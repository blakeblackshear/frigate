import { HitCanvas, SceneCanvas } from './Canvas.js';
import { SceneContext } from './Context.js';
import { Node, NodeConfig } from './Node.js';
import { Shape } from './Shape.js';
import { GetSet, IRect } from './types.js';
export type ClipFuncOutput = void | [Path2D | CanvasFillRule] | [Path2D, CanvasFillRule];
export interface ContainerConfig extends NodeConfig {
    clearBeforeDraw?: boolean;
    clipFunc?: (ctx: SceneContext) => ClipFuncOutput;
    clipX?: number;
    clipY?: number;
    clipWidth?: number;
    clipHeight?: number;
}
export declare abstract class Container<ChildType extends Node = Node> extends Node<ContainerConfig> {
    children: Array<ChildType>;
    getChildren(filterFunc?: (item: Node) => boolean): ChildType[];
    hasChildren(): boolean;
    removeChildren(): this;
    destroyChildren(): this;
    abstract _validateAdd(node: Node): void;
    add(...children: ChildType[]): this;
    destroy(): this;
    find<ChildNode extends Node>(selector: any): Array<ChildNode>;
    findOne<ChildNode extends Node = Node>(selector: string | Function): ChildNode | undefined;
    _generalFind<ChildNode extends Node>(selector: string | Function, findOne: boolean): ChildNode[];
    private _descendants;
    toObject(): {
        attrs: any;
        className: string;
        children?: Array<any>;
    };
    isAncestorOf(node: Node): boolean;
    clone(obj?: any): this;
    getAllIntersections(pos: any): Shape<import("./Shape.js").ShapeConfig>[];
    _clearSelfAndDescendantCache(attr?: string): void;
    _setChildrenIndices(): void;
    drawScene(can?: SceneCanvas, top?: Node, bufferCanvas?: SceneCanvas): this;
    drawHit(can?: HitCanvas, top?: Node): this;
    _drawChildren(drawMethod: any, canvas: any, top: any, bufferCanvas?: any): void;
    getClientRect(config?: {
        skipTransform?: boolean;
        skipShadow?: boolean;
        skipStroke?: boolean;
        relativeTo?: Container<Node>;
    }): IRect;
    clip: GetSet<IRect, this>;
    clipX: GetSet<number, this>;
    clipY: GetSet<number, this>;
    clipWidth: GetSet<number, this>;
    clipHeight: GetSet<number, this>;
    clipFunc: GetSet<(ctx: CanvasRenderingContext2D, shape: Container) => ClipFuncOutput, this>;
}
