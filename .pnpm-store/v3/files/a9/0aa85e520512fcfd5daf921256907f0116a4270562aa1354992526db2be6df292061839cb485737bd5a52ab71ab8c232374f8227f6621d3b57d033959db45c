import { polygonHachureLines } from './scan-line-hachure';
export class HachureFiller {
    constructor(helper) {
        this.helper = helper;
    }
    fillPolygons(polygonList, o) {
        return this._fillPolygons(polygonList, o);
    }
    _fillPolygons(polygonList, o) {
        const lines = polygonHachureLines(polygonList, o);
        const ops = this.renderLines(lines, o);
        return { type: 'fillSketch', ops };
    }
    renderLines(lines, o) {
        const ops = [];
        for (const line of lines) {
            ops.push(...this.helper.doubleLineOps(line[0][0], line[0][1], line[1][0], line[1][1], o));
        }
        return ops;
    }
}
