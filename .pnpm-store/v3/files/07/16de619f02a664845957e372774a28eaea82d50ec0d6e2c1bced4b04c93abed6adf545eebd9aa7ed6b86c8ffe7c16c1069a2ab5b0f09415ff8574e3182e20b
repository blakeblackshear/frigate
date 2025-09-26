import { Context } from '../Context.js';
import { Shape, ShapeConfig } from '../Shape.js';
import { Text } from './Text.js';
import { GetSet, PathSegment, Vector2d } from '../types.js';
export interface TextPathConfig extends ShapeConfig {
    text?: string;
    data?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: string;
    letterSpacing?: number;
}
export declare class TextPath extends Shape<TextPathConfig> {
    dummyCanvas: HTMLCanvasElement;
    dataArray: PathSegment[];
    glyphInfo: Array<{
        transposeX: number;
        transposeY: number;
        text: string;
        rotation: number;
        p0: Vector2d;
        p1: Vector2d;
    }>;
    partialText: string;
    pathLength: number;
    textWidth: number;
    textHeight: number;
    constructor(config?: TextPathConfig);
    _getTextPathLength(): number;
    _getPointAtLength(length: number): {
        x: number;
        y: number;
    } | null;
    _readDataAttribute(): void;
    _sceneFunc(context: Context): void;
    _hitFunc(context: Context): void;
    getTextWidth(): number;
    getTextHeight(): number;
    setText(text: string): Text;
    _getContextFont(): string;
    _getTextSize(text: string): {
        width: number;
        height: number;
    };
    _setTextData(): null | undefined;
    getSelfRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    destroy(): this;
    fontFamily: GetSet<string, this>;
    fontSize: GetSet<number, this>;
    fontStyle: GetSet<string, this>;
    fontVariant: GetSet<string, this>;
    align: GetSet<string, this>;
    letterSpacing: GetSet<number, this>;
    text: GetSet<string, this>;
    data: GetSet<string, this>;
    kerningFunc: GetSet<(leftChar: string, rightChar: string) => number, this>;
    textBaseline: GetSet<string, this>;
    textDecoration: GetSet<string, this>;
}
