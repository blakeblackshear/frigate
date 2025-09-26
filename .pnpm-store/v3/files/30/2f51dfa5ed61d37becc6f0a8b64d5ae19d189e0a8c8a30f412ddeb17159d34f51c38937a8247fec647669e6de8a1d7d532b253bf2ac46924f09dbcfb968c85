import { PatternFiller, RenderHelper } from './filler-interface';
import { ResolvedOptions, OpSet, Op } from '../core';
import { Point, Line } from '../geometry';
export declare class HachureFiller implements PatternFiller {
    private helper;
    constructor(helper: RenderHelper);
    fillPolygons(polygonList: Point[][], o: ResolvedOptions): OpSet;
    protected _fillPolygons(polygonList: Point[][], o: ResolvedOptions): OpSet;
    protected renderLines(lines: Line[], o: ResolvedOptions): Op[];
}
