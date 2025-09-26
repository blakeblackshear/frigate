import { Shape, ShapeConfig } from '../Shape.js';
import { Group } from '../Group.js';
import { Context } from '../Context.js';
import { ContainerConfig } from '../Container.js';
import { GetSet } from '../types.js';
import { Text } from './Text.js';
export interface LabelConfig extends ContainerConfig {
}
declare const NONE = "none";
export declare class Label extends Group {
    constructor(config?: LabelConfig);
    getText(): Text;
    getTag(): Tag;
    _addListeners(text: any): void;
    getWidth(): number;
    getHeight(): number;
    _sync(): void;
}
export interface TagConfig extends ShapeConfig {
    pointerDirection?: string;
    pointerWidth?: number;
    pointerHeight?: number;
    cornerRadius?: number | Array<number>;
}
export declare class Tag extends Shape<TagConfig> {
    _sceneFunc(context: Context): void;
    getSelfRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    pointerDirection: GetSet<'left' | 'up' | 'right' | 'down' | typeof NONE, this>;
    pointerWidth: GetSet<number, this>;
    pointerHeight: GetSet<number, this>;
    cornerRadius: GetSet<number, this>;
}
export {};
