import { lineLength } from '../geometry';
import { polygonHachureLines } from './scan-line-hachure';
export class DashedFiller {
    constructor(helper) {
        this.helper = helper;
    }
    fillPolygons(polygonList, o) {
        const lines = polygonHachureLines(polygonList, o);
        return { type: 'fillSketch', ops: this.dashedLine(lines, o) };
    }
    dashedLine(lines, o) {
        const offset = o.dashOffset < 0 ? (o.hachureGap < 0 ? (o.strokeWidth * 4) : o.hachureGap) : o.dashOffset;
        const gap = o.dashGap < 0 ? (o.hachureGap < 0 ? (o.strokeWidth * 4) : o.hachureGap) : o.dashGap;
        const ops = [];
        lines.forEach((line) => {
            const length = lineLength(line);
            const count = Math.floor(length / (offset + gap));
            const startOffset = (length + gap - (count * (offset + gap))) / 2;
            let p1 = line[0];
            let p2 = line[1];
            if (p1[0] > p2[0]) {
                p1 = line[1];
                p2 = line[0];
            }
            const alpha = Math.atan((p2[1] - p1[1]) / (p2[0] - p1[0]));
            for (let i = 0; i < count; i++) {
                const lstart = i * (offset + gap);
                const lend = lstart + offset;
                const start = [p1[0] + (lstart * Math.cos(alpha)) + (startOffset * Math.cos(alpha)), p1[1] + lstart * Math.sin(alpha) + (startOffset * Math.sin(alpha))];
                const end = [p1[0] + (lend * Math.cos(alpha)) + (startOffset * Math.cos(alpha)), p1[1] + (lend * Math.sin(alpha)) + (startOffset * Math.sin(alpha))];
                ops.push(...this.helper.doubleLineOps(start[0], start[1], end[0], end[1], o));
            }
        });
        return ops;
    }
}
