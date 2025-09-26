import { Shape, ShapeConfig } from '../Shape.js';
import { GetSet, PathSegment } from '../types.js';
export interface PathConfig extends ShapeConfig {
    data?: string;
}
export declare class Path extends Shape<PathConfig> {
    dataArray: PathSegment[];
    pathLength: number;
    constructor(config?: PathConfig);
    _readDataAttribute(): void;
    _sceneFunc(context: any): void;
    getSelfRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    getLength(): number;
    getPointAtLength(length: number): {
        x: number;
        y: number;
    } | null;
    data: GetSet<string, this>;
    static getLineLength(x1: any, y1: any, x2: any, y2: any): number;
    static getPathLength(dataArray: PathSegment[]): number;
    static getPointAtLengthOfDataArray(length: number, dataArray: PathSegment[]): {
        x: number;
        y: number;
    } | null;
    static getPointOnLine(dist: number, P1x: number, P1y: number, P2x: number, P2y: number, fromX?: number, fromY?: number): {
        x: number;
        y: number;
    };
    static getPointOnCubicBezier(pct: number, P1x: number, P1y: number, P2x: number, P2y: number, P3x: number, P3y: number, P4x: number, P4y: number): {
        x: number;
        y: number;
    };
    static getPointOnQuadraticBezier(pct: any, P1x: any, P1y: any, P2x: any, P2y: any, P3x: any, P3y: any): {
        x: number;
        y: number;
    };
    static getPointOnEllipticalArc(cx: number, cy: number, rx: number, ry: number, theta: number, psi: number): {
        x: number;
        y: number;
    };
    static parsePathData(data: any): PathSegment[];
    static calcLength(x: any, y: any, cmd: any, points: any): any;
    static convertEndpointToCenterParameterization(x1: number, y1: number, x2: number, y2: number, fa: number, fs: number, rx: number, ry: number, psiDeg: number): number[];
}
