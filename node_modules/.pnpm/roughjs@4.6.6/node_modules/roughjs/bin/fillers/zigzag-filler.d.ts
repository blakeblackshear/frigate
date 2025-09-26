import { HachureFiller } from './hachure-filler';
import { ResolvedOptions, OpSet } from '../core';
import { Point } from '../geometry';
export declare class ZigZagFiller extends HachureFiller {
    fillPolygons(polygonList: Point[][], o: ResolvedOptions): OpSet;
}
