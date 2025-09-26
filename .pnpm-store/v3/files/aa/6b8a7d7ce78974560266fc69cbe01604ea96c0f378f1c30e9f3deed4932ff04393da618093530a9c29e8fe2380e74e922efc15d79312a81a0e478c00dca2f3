import { line, solidFillPolygon, patternFillPolygons, rectangle, ellipseWithParams, generateEllipseParams, linearPath, arc, patternFillArc, curve, svgPath } from './renderer.js';
import { randomSeed } from './math.js';
import { curveToBezier } from 'points-on-curve/lib/curve-to-bezier.js';
import { pointsOnBezierCurves } from 'points-on-curve';
import { pointsOnPath } from 'points-on-path';
const NOS = 'none';
export class RoughGenerator {
    constructor(config) {
        this.defaultOptions = {
            maxRandomnessOffset: 2,
            roughness: 1,
            bowing: 1,
            stroke: '#000',
            strokeWidth: 1,
            curveTightness: 0,
            curveFitting: 0.95,
            curveStepCount: 9,
            fillStyle: 'hachure',
            fillWeight: -1,
            hachureAngle: -41,
            hachureGap: -1,
            dashOffset: -1,
            dashGap: -1,
            zigzagOffset: -1,
            seed: 0,
            disableMultiStroke: false,
            disableMultiStrokeFill: false,
            preserveVertices: false,
            fillShapeRoughnessGain: 0.8,
        };
        this.config = config || {};
        if (this.config.options) {
            this.defaultOptions = this._o(this.config.options);
        }
    }
    static newSeed() {
        return randomSeed();
    }
    _o(options) {
        return options ? Object.assign({}, this.defaultOptions, options) : this.defaultOptions;
    }
    _d(shape, sets, options) {
        return { shape, sets: sets || [], options: options || this.defaultOptions };
    }
    line(x1, y1, x2, y2, options) {
        const o = this._o(options);
        return this._d('line', [line(x1, y1, x2, y2, o)], o);
    }
    rectangle(x, y, width, height, options) {
        const o = this._o(options);
        const paths = [];
        const outline = rectangle(x, y, width, height, o);
        if (o.fill) {
            const points = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
            if (o.fillStyle === 'solid') {
                paths.push(solidFillPolygon([points], o));
            }
            else {
                paths.push(patternFillPolygons([points], o));
            }
        }
        if (o.stroke !== NOS) {
            paths.push(outline);
        }
        return this._d('rectangle', paths, o);
    }
    ellipse(x, y, width, height, options) {
        const o = this._o(options);
        const paths = [];
        const ellipseParams = generateEllipseParams(width, height, o);
        const ellipseResponse = ellipseWithParams(x, y, o, ellipseParams);
        if (o.fill) {
            if (o.fillStyle === 'solid') {
                const shape = ellipseWithParams(x, y, o, ellipseParams).opset;
                shape.type = 'fillPath';
                paths.push(shape);
            }
            else {
                paths.push(patternFillPolygons([ellipseResponse.estimatedPoints], o));
            }
        }
        if (o.stroke !== NOS) {
            paths.push(ellipseResponse.opset);
        }
        return this._d('ellipse', paths, o);
    }
    circle(x, y, diameter, options) {
        const ret = this.ellipse(x, y, diameter, diameter, options);
        ret.shape = 'circle';
        return ret;
    }
    linearPath(points, options) {
        const o = this._o(options);
        return this._d('linearPath', [linearPath(points, false, o)], o);
    }
    arc(x, y, width, height, start, stop, closed = false, options) {
        const o = this._o(options);
        const paths = [];
        const outline = arc(x, y, width, height, start, stop, closed, true, o);
        if (closed && o.fill) {
            if (o.fillStyle === 'solid') {
                const fillOptions = Object.assign({}, o);
                fillOptions.disableMultiStroke = true;
                const shape = arc(x, y, width, height, start, stop, true, false, fillOptions);
                shape.type = 'fillPath';
                paths.push(shape);
            }
            else {
                paths.push(patternFillArc(x, y, width, height, start, stop, o));
            }
        }
        if (o.stroke !== NOS) {
            paths.push(outline);
        }
        return this._d('arc', paths, o);
    }
    curve(points, options) {
        const o = this._o(options);
        const paths = [];
        const outline = curve(points, o);
        if (o.fill && o.fill !== NOS) {
            if (o.fillStyle === 'solid') {
                const fillShape = curve(points, Object.assign(Object.assign({}, o), { disableMultiStroke: true, roughness: o.roughness ? (o.roughness + o.fillShapeRoughnessGain) : 0 }));
                paths.push({
                    type: 'fillPath',
                    ops: this._mergedShape(fillShape.ops),
                });
            }
            else {
                const polyPoints = [];
                const inputPoints = points;
                if (inputPoints.length) {
                    const p1 = inputPoints[0];
                    const pointsList = (typeof p1[0] === 'number') ? [inputPoints] : inputPoints;
                    for (const points of pointsList) {
                        if (points.length < 3) {
                            polyPoints.push(...points);
                        }
                        else if (points.length === 3) {
                            polyPoints.push(...pointsOnBezierCurves(curveToBezier([
                                points[0],
                                points[0],
                                points[1],
                                points[2],
                            ]), 10, (1 + o.roughness) / 2));
                        }
                        else {
                            polyPoints.push(...pointsOnBezierCurves(curveToBezier(points), 10, (1 + o.roughness) / 2));
                        }
                    }
                }
                if (polyPoints.length) {
                    paths.push(patternFillPolygons([polyPoints], o));
                }
            }
        }
        if (o.stroke !== NOS) {
            paths.push(outline);
        }
        return this._d('curve', paths, o);
    }
    polygon(points, options) {
        const o = this._o(options);
        const paths = [];
        const outline = linearPath(points, true, o);
        if (o.fill) {
            if (o.fillStyle === 'solid') {
                paths.push(solidFillPolygon([points], o));
            }
            else {
                paths.push(patternFillPolygons([points], o));
            }
        }
        if (o.stroke !== NOS) {
            paths.push(outline);
        }
        return this._d('polygon', paths, o);
    }
    path(d, options) {
        const o = this._o(options);
        const paths = [];
        if (!d) {
            return this._d('path', paths, o);
        }
        d = (d || '').replace(/\n/g, ' ').replace(/(-\s)/g, '-').replace('/(\s\s)/g', ' ');
        const hasFill = o.fill && o.fill !== 'transparent' && o.fill !== NOS;
        const hasStroke = o.stroke !== NOS;
        const simplified = !!(o.simplification && (o.simplification < 1));
        const distance = simplified ? (4 - 4 * (o.simplification || 1)) : ((1 + o.roughness) / 2);
        const sets = pointsOnPath(d, 1, distance);
        const shape = svgPath(d, o);
        if (hasFill) {
            if (o.fillStyle === 'solid') {
                if (sets.length === 1) {
                    const fillShape = svgPath(d, Object.assign(Object.assign({}, o), { disableMultiStroke: true, roughness: o.roughness ? (o.roughness + o.fillShapeRoughnessGain) : 0 }));
                    paths.push({
                        type: 'fillPath',
                        ops: this._mergedShape(fillShape.ops),
                    });
                }
                else {
                    paths.push(solidFillPolygon(sets, o));
                }
            }
            else {
                paths.push(patternFillPolygons(sets, o));
            }
        }
        if (hasStroke) {
            if (simplified) {
                sets.forEach((set) => {
                    paths.push(linearPath(set, false, o));
                });
            }
            else {
                paths.push(shape);
            }
        }
        return this._d('path', paths, o);
    }
    opsToPath(drawing, fixedDecimals) {
        let path = '';
        for (const item of drawing.ops) {
            const data = ((typeof fixedDecimals === 'number') && fixedDecimals >= 0) ? (item.data.map((d) => +d.toFixed(fixedDecimals))) : item.data;
            switch (item.op) {
                case 'move':
                    path += `M${data[0]} ${data[1]} `;
                    break;
                case 'bcurveTo':
                    path += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
                    break;
                case 'lineTo':
                    path += `L${data[0]} ${data[1]} `;
                    break;
            }
        }
        return path.trim();
    }
    toPaths(drawable) {
        const sets = drawable.sets || [];
        const o = drawable.options || this.defaultOptions;
        const paths = [];
        for (const drawing of sets) {
            let path = null;
            switch (drawing.type) {
                case 'path':
                    path = {
                        d: this.opsToPath(drawing),
                        stroke: o.stroke,
                        strokeWidth: o.strokeWidth,
                        fill: NOS,
                    };
                    break;
                case 'fillPath':
                    path = {
                        d: this.opsToPath(drawing),
                        stroke: NOS,
                        strokeWidth: 0,
                        fill: o.fill || NOS,
                    };
                    break;
                case 'fillSketch':
                    path = this.fillSketch(drawing, o);
                    break;
            }
            if (path) {
                paths.push(path);
            }
        }
        return paths;
    }
    fillSketch(drawing, o) {
        let fweight = o.fillWeight;
        if (fweight < 0) {
            fweight = o.strokeWidth / 2;
        }
        return {
            d: this.opsToPath(drawing),
            stroke: o.fill || NOS,
            strokeWidth: fweight,
            fill: NOS,
        };
    }
    _mergedShape(input) {
        return input.filter((d, i) => {
            if (i === 0) {
                return true;
            }
            if (d.op === 'move') {
                return false;
            }
            return true;
        });
    }
}
