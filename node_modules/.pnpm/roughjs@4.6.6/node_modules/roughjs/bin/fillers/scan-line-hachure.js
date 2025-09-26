import { hachureLines } from 'hachure-fill';
export function polygonHachureLines(polygonList, o) {
    var _a;
    const angle = o.hachureAngle + 90;
    let gap = o.hachureGap;
    if (gap < 0) {
        gap = o.strokeWidth * 4;
    }
    gap = Math.round(Math.max(gap, 0.1));
    let skipOffset = 1;
    if (o.roughness >= 1) {
        if ((((_a = o.randomizer) === null || _a === void 0 ? void 0 : _a.next()) || Math.random()) > 0.7) {
            skipOffset = gap;
        }
    }
    return hachureLines(polygonList, gap, angle, skipOffset || 1);
}
